import { computed, Lambda } from 'mobx'

type Dictionary<T> = { [ key: string ]: T }

type WhenInformation = {
  predicate: () => boolean
  disposer?: Lambda
  originalFunction?: Function
  parameters: any[]
}

let whenMap: WeakMap<any, Dictionary<WhenInformation>>

interface IParams {
  /**
   * Predicate function that indicates whether the function should be called or not.
   *
   * @returns {boolean} True if the function should be called.
   * @memberof IParams
   */
  predicate(): boolean

  /**
   * Parameters for the decorated function.
   *
   * @type {any[]}
   * @memberof IParams
   */
  parameters?: any[]

  /**
   * Initializer function name, this is required to bind the functions with
   * the instance. If not provided, then target/prototype will be used.
   *
   * @type {string}
   * @memberof IParams
   */
  initFunctionName?: string

  /**
   * Deinitializer function name, since the tracking is done by utilizing
   * the `computed` function of the `mobx` library. Hence, this function will
   * be executed to unsubscribe from the change observable.
   *
   * @type {string}
   * @memberof IParams
   */
  deinitFunctionName?: string
}

/**
 * A decorator to run a method whenever the `computed` predicate returns true.
 *
 * The function will be immediately fired if the computed condition returns true.
 *
 * This function also defines a global interface called `WhenDecorator`, which allows you to extend the
 * `when` decorator.
 *
 * Functions are bounded to the class instances.
 *
 * @example ```ts
 * // Extending when with TypeScript
 * class UserState {
 *   @observable loggedIn = false
 * }
 *
 * const state = new UserState()
 *
 * declare global {
 *   interface WhenDecorator {
 *     userLoggedIn(...parameters: any[]): MethodDecorator
 *   }
 * }
 *
 * when.userLoggedIn = (...parameters: any[]) => when(() => state.loggedIn, ...parameters)
 * ```
 *
 * @example ```ts
 * class MainScreen extends React.PureComponent {
 *   @when.userLoggedIn()
 *   private onUserLoggedIn() {
 *     // This function may be called manually, and will be
 *     // automatically called when user logs in.
 *     console.log('User has logged in!')
 *   }
 *
 *   componentDidMount() {
 *     // After 5 seconds, the function above will be called.
 *     setTimeout(() => state.loggedIn = true, 5000)
 *   }
 *
 *   @when(() => state.loggedIn)
 *   private anotherFunctionExample() {
 *     console.log('Withouth extension, user has logged in!')
 *   }
 * }
 * ```
 *
 * @param {() => boolean} predicate Predicate to observe.
 * @param {...any[]} parameters Parameters for the function decorated.
 * @returns A Method Decorator
 */
function when(predicateOrParameters: (IParams | (() => boolean)), ...parameters: any[]) {
  let params: IParams
  if (typeof predicateOrParameters === 'function') {
    params = {
      parameters,
      predicate: predicateOrParameters,
      initFunctionName: 'componentDidMount',
      deinitFunctionName: 'componentWillUnmount',
    }
  }
  else {
    params = predicateOrParameters
  }

  const {
    predicate,
    parameters: funcParams,
    initFunctionName = 'componentDidMount',
    deinitFunctionName = 'componentWillUnmount',
  } = params

  return function decorate(this: any, target: any, propertyName: string | symbol, descriptor: TypedPropertyDescriptor<Function>) {
    if (!whenMap) {
      whenMap = new WeakMap()
    }

    let dictionary: Dictionary<WhenInformation>
    if (!whenMap.has(target)) {
      whenMap.set(target, dictionary = {})

      const originalInitializer = target[ initFunctionName ]
      const originalDeinitializer = target[ deinitFunctionName ]

      if (typeof originalInitializer !== 'undefined') {
        Object.defineProperty(target, initFunctionName, {
          configurable: true,
          value(...params: any[]) {
            originalInitializer?.apply(this, params)

            const map = whenMap.get(target)
            if (!map) { return }
            for (const propertyKey in map) {
              const { parameters, predicate, originalFunction } = map[ propertyKey ]

              map[ propertyKey ].disposer = computed(predicate.bind(this)).observe(({ newValue }) => {
                if (newValue) {
                  originalFunction?.apply(this, parameters)
                }
              })

              if (predicate.call(this)) {
                originalFunction?.apply(this, parameters)
              }
            }
          }
        })
      }
      else {
        throw new Error('No initializer function is provided for @when')
      }

      if (typeof originalDeinitializer !== 'undefined') {
        Object.defineProperty(target, deinitFunctionName, {
          configurable: true,
          value(...params: any[]) {
            originalDeinitializer?.apply(this, params)
            const dict = whenMap.get(target)
            if (!dict) { return }

            for (const propertyKey in dict) {
              const { disposer } = dict[ propertyKey ]
              disposer?.()
            }
          }
        })
      }
      else {
        throw new Error('No deinitializer function is provided for @when')
      }
    }
    else {
      dictionary = whenMap.get(target)!
    }

    if (propertyName in dictionary) {
      return descriptor
    }

    const originalFunction = descriptor.value

    dictionary[ propertyName as string ] = {
      predicate,
      originalFunction,
      parameters: funcParams
    }

    return descriptor
  }
}

const _when = when as unknown as WhenDecorator
export { _when as when }

type _When = ((predicateOrParameters: (IParams | (() => boolean)), ...parameters: any[]) => MethodDecorator)

declare global {
  /**
   * An interface for `@when` decorator. Extend this interface by declaring your own extensions.
   *
   * @interface WhenDecorator
   */
  interface WhenDecorator extends _When {
  }
}
