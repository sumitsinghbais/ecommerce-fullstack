import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ShopContext } from '../context/ShopContext';

// Mock symbols for context
const mockContext = {
  getCartCount: () => 5,
  setShowSearch: jest.fn(),
  token: '',
  setToken: jest.fn(),
  navigate: jest.fn(),
};

// Mock assets
jest.mock('../assets/assets', () => ({
  assets: {
    logo: 'logo-mock.png',
  }
}));

const renderNavbar = (contextValue = mockContext) => {
  return render(
    <ShopContext.Provider value={contextValue}>
      <BrowserRouter>
        <Navbar />
      </BrowserRouter>
    </ShopContext.Provider>
  );
};

describe('Navbar Component', () => {
  test('matches snapshot', () => {
    const { asFragment } = renderNavbar();
    expect(asFragment()).toMatchSnapshot();
  });

  test('renders logo and navigation links', () => {
    renderNavbar();
    expect(screen.getByAltText(/Logo/i)).toBeInTheDocument();
    // Use getAllByText for "Home" since it's in both desktop and mobile views
    const homeLinks = screen.getAllByText(/Home/i);
    expect(homeLinks.length).toBeGreaterThan(0);
  });

  test('displays correct cart count from context', () => {
    renderNavbar();
    const cartCounts = screen.getAllByText('5');
    expect(cartCounts.length).toBeGreaterThan(0);
  });

  test('shows login link when not authenticated', () => {
    renderNavbar({ ...mockContext, token: '' });
    const links = screen.getAllByRole('link');
    const hasLoginLink = links.some(link => link.getAttribute('href') === '/login');
    expect(hasLoginLink).toBe(true);
  });
});
