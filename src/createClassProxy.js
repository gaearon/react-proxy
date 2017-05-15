import find from 'lodash/find';
import supportsProtoAssignment from './supportsProtoAssignment';
import React from 'react';
import { shallow } from 'enzyme';

const RESERVED_STATICS = [
  'length',
  'displayName',
  'name',
  'arguments',
  'caller',
  'prototype',
  'toString'
];

function isEqualDescriptor(a, b) {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  for (let key in a) {
    if (a[key] !== b[key]) {
      return false;
    }
  }
  return true;
}

function getDisplayName(Component) {
  const displayName = Component.displayName || Component.name;
  return (displayName && displayName !== 'ReactComponent' && displayName !== 'Constructor') ?
    displayName :
    'Unknown';
}

// This was originally a WeakMap but we had issues with React Native:
// https://github.com/gaearon/react-proxy/issues/50#issuecomment-192928066
let allProxies = [];
function findProxy(Component) {
  const pair = find(allProxies, ([key, wrapper]) => key === Component || Component === wrapper.get());
  return pair ? pair[1] : null;
}
function addProxy(Component, proxy) {
  allProxies.push([Component, proxy]);
}

function proxyClass(Component) {
  // Prevent double wrapping
  // Given a proxy class, return the existing proxy managing it
  const existingProxy = findProxy(Component);

  if (existingProxy) {
    return existingProxy;
  }

  let newComponent = null
  let newComponentInstance = null
  let proxyInstance = null
  let ProxyComponent = new Proxy(Component, {

    construct(target, argumentsList, newTarget) {

      const obj = Reflect.construct(Component, argumentsList);

      const tempInstance = new Proxy(obj, {
        get(target, propKey, receiver) {

          const reactInternals = [
            'state',
            'setState',
            '_reactInternalInstance',
            'updater',
            'context',
            'constructor',
            'selector',
            'props',
            'didUnmount'
          ] // Can we get those automatically?

          const reactLifecycleMethods = [
            'shouldComponentUpdate',
            'componentDidUpdate',
            'componentWillUpdate'
          ]

          if (newComponentInstance) {
            if (reactInternals.includes(propKey) || reactLifecycleMethods.includes(propKey)) {
              return Reflect.get(target, propKey, receiver);
            }
                const originalComponentWillUpdate = newComponentInstance.componentWillUpdate
                newComponentInstance.componentWillUpdate = function(nextProps, nextState) {
                  proxyInstance.setState(nextState)
                  if (originalComponentWillUpdate) {
                    Reflect.apply(originalComponentWillUpdate, newComponentInstance, [nextProps, nextState]);
                  }
                }

                return Reflect.get(newComponentInstance, propKey, receiver);
              }
          return Reflect.get(target, propKey, receiver);
        }
      })

      if (!proxyInstance) {
        proxyInstance = tempInstance
      }

      return tempInstance;
    },
    get(target, propKey, receiver) {
      // if (newComponent && newComponent !== proxy) // prevents proxy cycle, but not mutal proxy cycles...
      if (newComponent) {
        return Reflect.get(newComponent, propKey, receiver);
      }
      return Reflect.get(target, propKey, receiver);
    },
    getOwnPropertyDescriptor(target, prop) {
      if (newComponent) {
        return Reflect.getOwnPropertyDescriptor(newComponent, prop);
    }
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }

  });

  const proxy = {
    get() {
      return ProxyComponent;
    },
    update(NewComponent) {
      // Prevent proxy cycles
      const existingProxy = findProxy(NewComponent);
      if (existingProxy) {
        return ;
      }

      newComponent = NewComponent
      if (newComponent.prototype.isReactComponent) {
        // Set initial state for newly mounted component
        if (proxyInstance) {

          // Get props from proxy to prevent undefined variables in render()
          const { context, props, state } = proxyInstance

          newComponentInstance = shallow(
            <NewComponent {...props} />,
            { context }
          ).instance()

          if (state) {
            newComponentInstance.setState(state)
          }
        }
      }
    }
  }

  addProxy(Component, proxy);

  return proxy;
}

function createFallback(Component) {
  let CurrentComponent = Component;

  return {
    get() {
      return CurrentComponent;
    },
    update(NextComponent) {
      CurrentComponent = NextComponent;
    }
  };
}

export default function createClassProxy(Component) {
  return Component.__proto__ && supportsProtoAssignment() ?
    proxyClass(Component) :
    createFallback(Component);
}
