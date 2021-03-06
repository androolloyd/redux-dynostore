/**
 * Copyright 2018, IOOF Holdings Limited.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react'
import { createStore } from 'redux'
import configureStore from 'redux-mock-store'
import { Provider, connect } from 'react-redux'
import { SubspaceProvider } from 'react-redux-subspace'
import { mount } from 'enzyme'

import dynostore from '@redux-dynostore/core'
import dynamic from '@redux-dynostore/react-redux'
import subspaced from 'src/subspaced'

const suppressError = f => {
  const error = console.error // eslint-disable-line no-console
  try {
    console.error = () => {} // eslint-disable-line no-console
    return f()
  } finally {
    console.error = error // eslint-disable-line no-console
  }
}

describe('subspaced tests', () => {
  const mockStore = configureStore([])
  let store

  class TestComponent extends React.Component {
    componentDidMount() {
      this.props.testDispatch()
    }

    render() {
      return <p>{this.props.testKey}</p>
    }
  }

  const mapStateToProps = state => ({
    testKey: state.testKey
  })

  const mapDispatchToProps = {
    testDispatch: () => ({ type: 'TEST_DISPATCH' })
  }

  const ConnectedTestComponent = connect(
    mapStateToProps,
    mapDispatchToProps
  )(TestComponent)

  beforeEach(() => {
    store = mockStore({
      testId: {
        testKey: 'root value'
      },
      parentId: {
        testId: {
          testKey: 'nested value'
        }
      }
    })
  })

  test('should create subspaced enhanced component', () => {
    const SubspacedComponent = subspaced()('testId')(store)(ConnectedTestComponent)
    const wrapper = mount(
      <Provider store={store}>
        <SubspaceProvider mapState={state => state.parentId} namespace="parentId">
          <SubspacedComponent />
        </SubspaceProvider>
      </Provider>
    )

    expect(wrapper.html()).toBe('<p>nested value</p>')

    const actions = store.getActions()
    expect(actions.length).toEqual(1)
    expect(actions[0]).toEqual({ type: 'parentId/testId/TEST_DISPATCH' })
  })

  test('should create subspaced enhanced component to a primative value', () => {
    const SubspacedComponent = subspaced()('testKey')(store)(
      connect(
        s => ({ testKey: s }),
        mapDispatchToProps
      )(TestComponent)
    )
    const wrapper = mount(
      <Provider store={store}>
        <SubspaceProvider mapState={state => state.parentId.testId} namespace="parentId/testId">
          <SubspacedComponent />
        </SubspaceProvider>
      </Provider>
    )

    expect(wrapper.html()).toBe('<p>nested value</p>')

    const actions = store.getActions()
    expect(actions.length).toEqual(1)
    expect(actions[0]).toEqual({ type: 'parentId/testId/testKey/TEST_DISPATCH' })
  })

  test('should use default state handler', () => {
    const stateHandler = {
      getValue: (state, key) => ({ ...state[key], testKey: 'override value' }),
      canMerge: state => typeof state === 'object',
      merge: (oldState, newState) => ({ ...oldState, ...newState })
    }

    store.dynostoreOptions = { stateHandler }

    const SubspacedComponent = subspaced()('testId')(store)(ConnectedTestComponent)
    const wrapper = mount(
      <Provider store={store}>
        <SubspaceProvider mapState={state => state.parentId} namespace="parentId">
          <SubspacedComponent />
        </SubspaceProvider>
      </Provider>
    )

    expect(wrapper.html()).toBe('<p>override value</p>')
  })

  test('should override state handler', () => {
    const stateHandler = {
      getValue: (state, key) => ({ ...state[key], testKey: 'override value' }),
      canMerge: state => typeof state === 'object',
      merge: (oldState, newState) => ({ ...oldState, ...newState })
    }

    const SubspacedComponent = subspaced({ stateHandler })('testId')(store)(ConnectedTestComponent)
    const wrapper = mount(
      <Provider store={store}>
        <SubspaceProvider mapState={state => state.parentId} namespace="parentId">
          <SubspacedComponent />
        </SubspaceProvider>
      </Provider>
    )

    expect(wrapper.html()).toBe('<p>override value</p>')
  })
})

describe('mapExtraState tests', () => {
  let store
  const initialState = {
    testId: {
      testKey: 'root value'
    },
    parentId: {
      testId: {
        testKey: 'nested value'
      }
    },
    extraState: {
      extraStateId: 'extra state value'
    },
    invalidExtraState: [0, 1, 2]
  }

  class TestComponent extends React.Component {
    componentDidMount() {
      this.props.testDispatch()
    }

    render() {
      return <p>{this.props.extraStateId}</p>
    }
  }

  const mapStateToProps = state => ({
    testKey: state.testKey,
    extraStateId: state.extraState.extraStateId
  })

  const mapDispatchToProps = {
    testDispatch: () => ({ type: 'TEST_DISPATCH' })
  }

  const ConnectedTestComponent = connect(
    mapStateToProps,
    mapDispatchToProps
  )(TestComponent)

  beforeEach(() => {
    store = createStore((state = initialState) => state, dynostore())
  })

  test('should create subspaced enhanced component with extraState', () => {
    const SubspacedComponent = dynamic(
      'testId',
      subspaced({
        mapExtraState: (state, rootState) => ({
          extraState: rootState.extraState
        })
      })
    )(ConnectedTestComponent)

    const wrapper = mount(
      <Provider store={store}>
        <SubspaceProvider mapState={state => state.parentId} namespace="parentId">
          <SubspacedComponent />
        </SubspaceProvider>
      </Provider>
    )

    expect(wrapper.html()).toBe('<p>extra state value</p>')
  })

  test('should use default state handler', () => {
    const stateHandler = {
      getValue: (state, key) => state[key],
      canMerge: state => typeof state === 'object',
      merge: (oldState, newState) => ({ ...oldState, ...newState, extraState: { extraStateId: 'override value' } })
    }
    const mapExtraState = (state, rootState) => ({ extraState: rootState.extraState })

    store.dynostoreOptions = { stateHandler }

    const SubspacedComponent = subspaced({ stateHandler, mapExtraState })('testId')(store)(ConnectedTestComponent)
    const wrapper = mount(
      <Provider store={store}>
        <SubspaceProvider mapState={state => state.parentId} namespace="parentId">
          <SubspacedComponent />
        </SubspaceProvider>
      </Provider>
    )

    expect(wrapper.html()).toBe('<p>override value</p>')
  })

  test('should override state handler', () => {
    const stateHandler = {
      getValue: (state, key) => state[key],
      canMerge: state => typeof state === 'object',
      merge: (oldState, newState) => ({ ...oldState, ...newState, extraState: { extraStateId: 'override value' } })
    }
    const mapExtraState = (state, rootState) => ({ extraState: rootState.extraState })

    const SubspacedComponent = subspaced({ stateHandler, mapExtraState })('testId')(store)(ConnectedTestComponent)
    const wrapper = mount(
      <Provider store={store}>
        <SubspaceProvider mapState={state => state.parentId} namespace="parentId">
          <SubspacedComponent />
        </SubspaceProvider>
      </Provider>
    )

    expect(wrapper.html()).toBe('<p>override value</p>')
  })

  test('should fail to create subspaced enhanced component with invalid extraState', () => {
    const SubspacedComponent = dynamic(
      'testId',
      subspaced({
        mapExtraState: (state, rootState) => rootState.invalidExtraState
      })
    )(ConnectedTestComponent)

    expect(() =>
      suppressError(() =>
        mount(
          <Provider store={store}>
            <SubspaceProvider mapState={state => state.parentId} namespace="parentId">
              <SubspacedComponent />
            </SubspaceProvider>
          </Provider>
        )
      )
    ).toThrow(TypeError)
  })
})
