import { test } from 'tap'
import { build } from '../helper.js'

test('unknown route returns 404', async (t) => {
  const app = await build(t)

  const res = await app.inject({
    url: '/example'
  })

  t.equal(res.statusCode, 404)
})
