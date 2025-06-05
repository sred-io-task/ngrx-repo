import { expecter } from 'ts-snippet';
import { compilerOptions } from './helpers';

describe('patchState', () => {
  const expectSnippet = expecter(
    (code) => `
        import { computed, inject, linkedSignal, Signal, signal } from '@angular/core';
        import {
          patchState,
          signalStore,
          withState,
          withLinkedState,
          withMethods
        } from '@ngrx/signals';

        ${code}
      `,
    compilerOptions()
  );

  it('does not have access to methods', () => {
    const snippet = `
      signalStore(
        withMethods(() => ({
          foo: () => 'bar',
        })),
        withLinkedState(({ foo }) => ({ value: foo() }))
      );
      `;

    expectSnippet(snippet).toFail(/Property 'foo' does not exist on type '{}'/);
  });

  it('does not have access to STATE_SOURCE', () => {
    const snippet = `
      signalStore(
        withState({ foo: 'bar' }),
        withLinkedState((store) => {
          patchState(store, { foo: 'baz' });
          return { bar: 'foo' };
        })
      )
      `;

    expectSnippet(snippet).toFail(
      /is not assignable to parameter of type 'WritableStateSource<object>'./
    );
  });

  it('cannot return a primitive value', () => {
    const snippet = `
      signalStore(
        withLinkedState(() => 'foo')
      )
      `;

    expectSnippet(snippet).toFail(
      /Type 'string' is not assignable to type 'object | WritableSignal<object>'./
    );
  });

  it('resolves to a normal state signal with automatic linkedSignal', () => {
    const snippet = `
      const UserStore = signalStore(
        { providedIn: 'root' },
        withLinkedState(() => ({ firstname: 'John', lastname: 'Doe' }))
      );

      const userStore = new UserStore();

      const firstname = userStore.firstname;
      const lastname = userStore.lastname;
    `;

    expectSnippet(snippet).toSucceed();

    expectSnippet(snippet).toInfer('firstname', 'Signal<string>');
    expectSnippet(snippet).toInfer('lastname', 'Signal<string>');
  });

  it('resolves to a normal state signal with manual linkedSignal', () => {
    const snippet = `
      const UserStore = signalStore(
        { providedIn: 'root' },
        withLinkedState(() =>
          linkedSignal(() => ({ firstname: 'John', lastname: 'Doe' }))
        )
      );

      const userStore = new UserStore();

      const firstname = userStore.firstname;
      const lastname = userStore.lastname;
    `;

    expectSnippet(snippet).toSucceed();

    expectSnippet(snippet).toInfer('firstname', 'Signal<string>');
    expectSnippet(snippet).toInfer('lastname', 'Signal<string>');
  });
});
