import test from 'node:test'
import assert from 'node:assert/strict'

import { slugify, isDuplicateSlugError } from './slug'

test('slugify strips accents and spaces', () => {
  assert.equal(slugify('Crème de Beauté'), 'creme-de-beaute')
  assert.equal(slugify('  Nouveau produit  '), 'nouveau-produit')
})

test('isDuplicateSlugError detects Prisma unique slug conflict', () => {
  const err = {
    code: 'P2002',
    message: "Unique constraint failed on the fields: (`products`.`slug`)",
    meta: { target: ['products', 'slug'] },
  }

  assert.equal(isDuplicateSlugError(err), true)
})
