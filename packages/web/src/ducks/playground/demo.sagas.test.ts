import { put, call } from 'redux-saga/effects'
import { incrementAsync, delay } from './demo.sagas'

const gen = incrementAsync()

test('incrementAsync Saga test', () => {
  expect(gen.next().value).toEqual(call(delay, 1000))
});

test('incrementAsync Saga must dispatch an INCREMENT action', ()=> {
    expect(gen.next().value).toEqual(
    put({type: 'INCREMENT'}))
 }
);

test('incrementAsync Saga must be done', () => {
    expect(gen.next()).toEqual({ done: true, value: undefined })
}
);