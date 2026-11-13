import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePasswordReset, parseRecoveryRequest } from './password-recovery-validation.ts';

test('validates and normalizes recovery requests', () => {
    assert.deepEqual(parseRecoveryRequest({ email: '  Test@Example.com ', locale: 'de' }), {
        email: 'test@example.com', locale: 'de',
    });
    for (const body of [null, {}, { email: 'invalid', locale: 'en' },
        { email: 'a@b.com', locale: 'fr' }, { email: `${'a'.repeat(250)}@b.com`, locale: 'en' }]) {
        assert.equal(parseRecoveryRequest(body), null);
    }
});

test('validates reset tokens, passwords and optional store keys', () => {
    assert.deepEqual(parsePasswordReset({ token: 'token', password: 'password', store: 'shop' }), {
        token: 'token', password: 'password', store: 'shop',
    });
    assert.deepEqual(parsePasswordReset({ token: 'token', password: 'password' }), {
        token: 'token', password: 'password', store: undefined,
    });
    for (const body of [null, {}, { token: '', password: 'password' },
        { token: 'token', password: 'short' }, { token: 'token', password: 'password', store: '' },
        { token: 'a'.repeat(1025), password: 'password' }, { token: 'token', password: 'a'.repeat(257) }]) {
        assert.equal(parsePasswordReset(body), null);
    }
});
