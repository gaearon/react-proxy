import React, { Component } from 'react';
import createShallowRenderer from './helpers/createShallowRenderer';
import expect from 'expect';
import { createProxy } from '../src';

const fixtures = {
  modern: {
    InstanceProperty: class InstanceProperty {
      answer = 42;

      render() {
        return <div>{this.answer}</div>;
      }
    },

    InstancePropertyUpdate: class InstancePropertyUpdate {
      answer = 43;

      render() {
        return <div>{this.answer}</div>;
      }
    },

    InstancePropertyRemoval: class InstancePropertyRemoval {
      render() {
        return <div>{this.answer}</div>;
      }
    }
  },

  classic: {
    InstanceProperty: React.createClass({
      componentWillMount() {
        this.answer = 42;
      },

      render() {
        return <div>{this.answer}</div>;
      }
    }),

    InstancePropertyUpdate: React.createClass({
      componentWillMount() {
        this.answer = 43;
      },

      render() {
        return <div>{this.answer}</div>;
      }
    }),

    InstancePropertyRemoval: React.createClass({
      render() {
        return <div>{this.answer}</div>;
      }
    })
  }
};

describe('instance property', () => {
  let renderer;
  let warnSpy;

  beforeEach(() => {
    renderer = createShallowRenderer();
    warnSpy = expect.spyOn(console, 'warn').andCallThrough();
  });

  afterEach(() => {
    warnSpy.destroy();
    expect(warnSpy.calls.length).toBe(0);
  });

  Object.keys(fixtures).forEach(type => {
    describe(type, () => {
      const { InstanceProperty, InstancePropertyUpdate, InstancePropertyRemoval } = fixtures[type];

      it('is available on proxy class instance', () => {
        const proxy = createProxy(InstanceProperty);
        const Proxy = proxy.get();
        const instance = renderer.render(<Proxy />);
        expect(renderer.getRenderOutput().props.children).toEqual(42);
        expect(instance.answer).toEqual(42);
      });

      it('is left unchanged when reassigned', () => {
        const proxy = createProxy(InstanceProperty);
        const Proxy = proxy.get();
        const instance = renderer.render(<Proxy />);
        expect(renderer.getRenderOutput().props.children).toEqual(42);

        instance.answer = 100;

        proxy.update(InstancePropertyUpdate);
        renderer.render(<Proxy />);
        expect(renderer.getRenderOutput().props.children).toEqual(100);
        expect(instance.answer).toEqual(100);

        proxy.update(InstancePropertyRemoval);
        renderer.render(<Proxy />);
        expect(renderer.getRenderOutput().props.children).toEqual(100);
        expect(instance.answer).toEqual(100);
      });

      /**
       * I'm not aware of any way of retrieving their new values
       * without calling the constructor, which seems like too much
       * of a side effect. We also don't want to overwrite them
       * in case they changed.
       */
      it('is left unchanged even if not reassigned (known limitation)', () => {
        const proxy = createProxy(InstanceProperty);
        const Proxy = proxy.get();
        const instance = renderer.render(<Proxy />);
        expect(renderer.getRenderOutput().props.children).toEqual(42);

        proxy.update(InstancePropertyUpdate);
        renderer.render(<Proxy />);
        expect(renderer.getRenderOutput().props.children).toEqual(42);
        expect(instance.answer).toEqual(42);

        proxy.update(InstancePropertyRemoval);
        renderer.render(<Proxy />);
        expect(renderer.getRenderOutput().props.children).toEqual(42);
        expect(instance.answer).toEqual(42);
      });
    });
  });
});