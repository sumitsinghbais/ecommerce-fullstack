describe('E-Commerce User Workflow', () => {
  const uniqueId = Date.now();
  const user = {
    name: `User_${uniqueId}`,
    email: `test_${uniqueId}@example.com`,
    password: 'Password123!',
  };

  beforeEach(() => {
    // Visit home page
    cy.visit('/');
  });

  it('Flow: Signup -> Login -> Add to Cart -> Checkout', () => {
    // 1. SIGNUP
    cy.visit('/login');
    cy.contains('Create one').click();
    cy.get('input[placeholder="Enter your name"]').type(user.name);
    cy.get('input[placeholder="Enter your email"]').type(user.email);
    cy.get('input[placeholder="Enter your password"]').type(user.password);
    cy.get('button[type="submit"]').click();
    
    // Should be redirected to home or collection
    cy.url().should('not.include', '/login');
    cy.contains('successfully').should('be.visible');

    // 2. SEARCH & ADD TO CART
    cy.visit('/collection');
    // Ensure products are loaded
    cy.get('.animate-spin').should('not.exist');
    cy.contains('Add to Cart').first().click();
    cy.contains('Added to cart!').should('be.visible');

    // 3. CART
    cy.get('a[href="/cart"]').first().click();
    cy.url().should('include', '/cart');
    cy.contains('Total').should('be.visible');
    cy.contains('PROCEED TO CHECKOUT').click();

    // 4. CHECKOUT
    cy.url().should('include', '/place-order');
    cy.get('input[placeholder="First name"]').type('Test');
    cy.get('input[placeholder="Last name"]').type('User');
    cy.get('input[placeholder="Email address"]').type(user.email);
    cy.get('input[placeholder="Street"]').type('123 Test St');
    cy.get('input[placeholder="City"]').type('Mumbai');
    cy.get('input[placeholder="State"]').type('MH');
    cy.get('input[placeholder="Zipcode"]').type('400001');
    cy.get('input[placeholder="Country"]').type('India');
    cy.get('input[placeholder="Phone"]').type('1234567890');
    
    cy.contains('PLACE ORDER').click();

    // 5. SUCCESS
    cy.url().should('include', '/orders');
    cy.contains('Payment Method').should('be.visible');
  });

  it('Error Flow: Invalid Login', () => {
    cy.visit('/login');
    cy.get('input[placeholder="Enter your email"]').type('wrong@user.com');
    cy.get('input[placeholder="Enter your password"]').type('wrongpassword');
    cy.get('button[type="submit"]').click();
    cy.contains('Something went wrong').should('be.visible');
  });

  it('Error Flow: Empty Cart Checkout', () => {
    cy.visit('/cart');
    // Ensure no items
    cy.get('button').contains('PROCEED TO CHECKOUT').should('be.disabled');
    // Depending on implementation, it might show "Your cart is empty"
    // If not disabled, clicking it should show an error
  });
});
