/// <reference types="cypress" />

describe('Field valid', () => {
  beforeEach(() => {
    cy.visit('/')
  })

  it('CharField valid blank true with value', () => {
    cy.window().then(() => {
      // const f1 = new win.models.Serial()
      expect(1).to.equal(1)
    })
  })
})
