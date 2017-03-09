import React, { Component } from 'react';
import createShallowRenderer from './helpers/createShallowRenderer';
import expect from 'expect';
import createProxy from '../src';

function createModernFixtures() {
  class Counter1x extends Component {
    constructor(props) {
      super(props);
      this.state = { counter: 0 };
      this.increment = this.increment.bind(this);
    }

    increment() {
      this.setState({
        counter: this.state.counter + 1
      });
    }

    render() {
      return <span>{this.state.counter}</span>;
    }
  }

  class Counter10x extends Component {
    constructor(props) {
      super(props);
      this.state = { counter: 0 };
      this.increment = this.increment.bind(this);
    }

    increment() {
      this.setState({
        counter: this.state.counter + 10
      });
    }

    render() {
      return <span>{this.state.counter}</span>;
    }
  }

  class Counter100x extends Component {
    constructor(props) {
      super(props);
      this.state = { counter: 0 };
      this.increment = this.increment.bind(this);
    }

    increment() {
      this.setState({
        counter: this.state.counter + 100
      });
    }

    render() {
      return <span>{this.state.counter}</span>;
    }
  }

  class CounterWithoutIncrementMethod extends Component {
    constructor(props) {
      super(props);
      this.state = { counter: 0 };
    }

    render() {
      return <span>{this.state.counter}</span>;
    }
  }

  return {
    Counter1x,
    Counter10x,
    Counter100x,
    CounterWithoutIncrementMethod
  };
}

describe('bound instance method', () => {
  let renderer;
  let warnSpy;

  beforeEach(() => {
    renderer = createShallowRenderer();
    warnSpy = expect.spyOn(console, 'error').andCallThrough();
  });

  afterEach(() => {
    warnSpy.destroy();
    expect(warnSpy.calls.length).toBe(0);
  });

  function runCommonTests(createFixtures) {
    let Counter1x;
    let Counter10x;
    let Counter100x;
    let CounterWithoutIncrementMethod;

    beforeEach(() => {
      ({
        Counter1x,
        Counter10x,
        Counter100x,
        CounterWithoutIncrementMethod
      } = createFixtures());
    });

    it('gets bound', () => {
      const proxy = createProxy(CounterWithoutIncrementMethod);
      const Proxy = proxy.get();
      const instance = renderer.render(<Proxy />);
      expect(renderer.getRenderOutput().props.children).toEqual(0);

      proxy.update(Counter1x);
      instance.increment.call(null);
      expect(renderer.getRenderOutput().props.children).toEqual(1);
    });

    it('is bound after getting replaced', () => {
      const proxy = createProxy(Counter1x);
      const Proxy = proxy.get();
      const instance = renderer.render(<Proxy />);
      expect(renderer.getRenderOutput().props.children).toEqual(0);
      instance.increment.call(null);
      expect(renderer.getRenderOutput().props.children).toEqual(1);

      proxy.update(Counter10x);
      instance.increment.call(null);
      renderer.render(<Proxy />);
      expect(renderer.getRenderOutput().props.children).toEqual(11);

      proxy.update(Counter100x);
      instance.increment.call(null);
      renderer.render(<Proxy />);
      expect(renderer.getRenderOutput().props.children).toEqual(111);
    });
  }


  describe('modern', () => {
    runCommonTests(createModernFixtures);
  });
});