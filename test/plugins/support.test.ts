import { test } from 'tap'
import Fastify from 'fastify'
import Sensible from '../../src/plugins/sensible.ts'

test('sensible plugin works standalone', async (t) => {
  const fastify = Fastify()
  void fastify.register(Sensible)
  await fastify.ready()

  t.type(fastify.httpErrors.notFound, 'function')
})
