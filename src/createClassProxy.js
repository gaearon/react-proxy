import find from 'lodash/find';
import createPrototypeProxy from './createPrototypeProxy';
import bindAutoBindMethods from './bindAutoBindMethods';
import deleteUnknownAutoBindMethods from './deleteUnknownAutoBindMethods';
import supportsProtoAssignment from './supportsProtoAssignment';
import React from 'react';
import { mount } from 'enzyme';

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
  const pair = find(allProxies, ([key]) => key === Component);
  return pair ? pair[1] : null;
}
function addProxy(Component, proxy) {
  allProxies.push([Component, proxy]);
}

function proxyClass(Component) {
  let newComponentInstance = null
  let proxyInstance = null
  let proxy = new Proxy(Component, {

    construct(target, argumentsList, newTarget) {
      const obj = Reflect.construct(Component, argumentsList);

      const tempInstance = new Proxy(obj, {
        get(target, propKey, receiver) {

          const reactInternals = [
            'updater',
            'state',
            'setState',
            'constructor',
            '_reactInternalInstance',
            'context',
            'getChildContext'
          ]

          const reactLifecycleMethods = [
            'shouldComponentUpdate',
            'componentDidUpdate',
            'componentWillUpdate'
          ]

          if (newComponentInstance) {

            if (!reactInternals.includes(propKey)) {

              if (!reactLifecycleMethods.includes(propKey)) {

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
            } else {
              return Reflect.get(target, propKey, receiver);
            }

          }

          return Reflect.get(target, propKey, receiver);
        }
      })

      proxyInstance = tempInstance

      return tempInstance;
    }
  });

  return {
    get() {
      return proxy;
    },
    update(NewComponent) {
      newComponentInstance = mount(<NewComponent />).get(0)
      if (proxyInstance && proxyInstance.state) {
        newComponentInstance.setState(proxyInstance.state)
      }
    }
  }
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
