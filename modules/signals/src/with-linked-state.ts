import { linkedSignal, WritableSignal } from '@angular/core';

import { toDeepSignal } from './deep-signal';
import { assertUniqueStoreMembers } from './signal-store-assertions';
import {
  EmptyFeatureResult,
  InnerSignalStore,
  SignalsDictionary,
  SignalStoreFeature,
  SignalStoreFeatureResult,
  StateSignals,
} from './signal-store-models';
import { isWritableSignal, STATE_SOURCE } from './state-source';
import { Prettify } from './ts-helpers';

type LinkedStateInput<State extends WritableSignal<object> | object> =
  State extends WritableSignal<infer V> ? V : State;

/**
 *
 * @description
 * Generates and adds the properties of a `linkedSignal`
 * to the store's state.
 *
 * @usageNotes
 * ```typescript
 * const UserStore = signalStore(
 *   withState({ options: [1, 2, 3] }),
 *   withLinkedState(({ options }) => ({ selectOption: options()[0] ?? undefined }))
 * );
 * ```
 *
 * The resulting state is of type `{ options: number[], selectOption: number | undefined }`.
 * Whenever the `options` signal changes, the `selectOption` will automatically update.
 *
 * For advanced use cases, `linkedSignal` can be called within `withLinkedState`:
 *
 * ```typescript
 * const UserStore = signalStore(
 *   withState({ id: 1 }),
 *   withLinkedState(({ id }) => linkedSignal({
 *     source: id,
 *     computation: () => ({ firstname: '', lastname: '' })
 *   }))
 * )
 * ```
 *
 * @param linkedStateFactory A function that returns a state object or a writable signal containing the state object.
 */
export function withLinkedState<
  State extends object,
  Input extends SignalStoreFeatureResult
>(
  linkedStateFactory: (
    store: Prettify<StateSignals<Input['state']> & Input['props']>
  ) => State | WritableSignal<State>
): SignalStoreFeature<
  Input,
  EmptyFeatureResult & {
    state: State;
  }
> {
  return (store) => {
    const linkedStateFactoryInput = { ...store.stateSignals, ...store.props };
    const linkedState = linkedSignal(() => {
      const signalOrValue = linkedStateFactory(linkedStateFactoryInput);
      if (isWritableSignal(signalOrValue)) {
        return signalOrValue();
      } else {
        return signalOrValue;
      }
    });
    const linkedStateValue = linkedState();
    const stateKeys = Reflect.ownKeys(linkedStateValue);

    assertUniqueStoreMembers(store, stateKeys);

    const stateSource = store[STATE_SOURCE] as SignalsDictionary;

    const stateSignals = {} as SignalsDictionary;
    for (const key of stateKeys) {
      stateSource[key] = linkedSignal(
        () => (linkedState() as Record<string | symbol, unknown>)[key]
      );
      stateSignals[key] = toDeepSignal(stateSource[key]);
    }

    return {
      ...store,
      stateSignals: { ...store.stateSignals, ...stateSignals },
    } as InnerSignalStore<State>;
  };
}
