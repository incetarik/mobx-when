# mobx-when
`@when()` decorator for changing MobX, especially useful `React.Component`.

This decorator takes a function to listen changes through `computed` of `MobX`. Hence it needs a class having two functions for initializing and deinitializing disposer of the `computed`. Since this library may be used with `React`, those are `componentDidMount` and `componentWillUnmount` by default. Hence, for `React` applications, you don't need to provide any name for the decorator.

This function has global interface declaration called `WhenDecorator`, which can be used for extending the `@when` decorator. Usage examples are shown below.

The function decorated will be executed whenever the computed value changes. This enables developer both connecting a function to a changing/computed variable and calling the function manually.

This library utilizes `WeakMap` to prevent/reduce instance modifications as much as possible.

# Example
```ts
class UserState {
  @observable id?: string
  @observable loggedIn = false
  @observable comments?: IComment[]
}

const userState = new UserState()

class CommentsView extends React.PureComponent {
  @when(() => userState.loggedIn)
  loadUserComments() {
    // The function here is also bound, hence, `this` refers to CommentsView
    // We assume that when user is logged, it gets an ID.
    return loadCommentsOf(userState.id)
  }

  someOtherFunction = () => {
    // You can also invoke the function above manually
    this.loadUserComments().then(comments => {
      userState.comments = comments
    })

    // ...
    console.log('User comments are loading')
    // ...
  }
}

// Extending example
// Since an interface is given, you can extend the interface to add
// more functionalities to the decorator.

declare global {
  interface WhenDecorator {
    userLoggedIn(...parameters: any[]): MethodDecorator
  }
}

when.userLoggedIn = (...parameters: any[]) => when(() => state.loggedIn, ...parameters)

// Now, we can do

class SomeView extends React.PureComponent {
  @when.userLoggedIn()
  private reloadUserInformation() {
    // ... Reloading user information, since this function will
    // automatically be called when user is logged in, we know that
    // user is logged in and can use id to load anything related.

    // ...
  }
}
```
