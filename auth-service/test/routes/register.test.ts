import * as assert from 'node:assert'
import { test } from 'node:test'
import { build } from '../helper'

test('register route', async (t) => {
	const app = await build(t)

	await t.test('should register a new user successfully', async () => {
		const res = await app.inject({
			method: 'POST',
			url: '/register',
			payload: {
				username: 'testuser',
				password: 'password123',
			}
		})

		assert.strictEqual(res.statusCode, 201)
		const body = JSON.parse(res.payload)
		assert.strictEqual(body.success, true)
		assert.ok(body.userId)
	})

	await t.test('should fail to register with duplicate username', async () => {
		const res = await app.inject({
			method: 'POST',
			url: '/register',
			payload: {
				username: 'testuser',
				password: 'password456',
			}
		})

		assert.strictEqual(res.statusCode, 409)
	})

	await t.test('should fail with missing password', async () => {
		const res = await app.inject({
			method: 'POST',
			url: '/register',
			payload: {
				username: 'testuser2',
			}
		})
		assert.strictEqual(res.statusCode, 500)
	})
})
