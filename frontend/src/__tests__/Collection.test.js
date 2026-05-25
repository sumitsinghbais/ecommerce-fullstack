import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Collection from '../pages/Collection';
import { ShopContext } from '../context/ShopContext';

const mockContext = {
  products: [],
  search: '',
  showSearch: false,
  loading: false,
  error: null,
};

const renderCollection = (contextValue = mockContext) => {
  return render(
    <ShopContext.Provider value={contextValue}>
      <BrowserRouter>
        <Collection />
      </BrowserRouter>
    </ShopContext.Provider>
  );
};

describe('Collection Page', () => {
  let mathRandomSpy;

  beforeAll(() => {
    // Mock Math.random to return a fixed value so the random discount in ProductItem is deterministic
    mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.81); 
  });

  afterAll(() => {
    mathRandomSpy.mockRestore();
  });

  test('matches snapshot', () => {
    const { asFragment } = renderCollection({
      ...mockContext,
      products: [{ _id: '1', name: 'Test Product', price: 10, category: 'Men' }]
    });
    expect(asFragment()).toMatchSnapshot();
  });

  test('renders loading state correctly', () => {
    const { container } = renderCollection({ ...mockContext, loading: true });
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  test('renders error state correctly', () => {
    renderCollection({ ...mockContext, error: 'Custom Error Message' });
    expect(screen.getByText(/Oops! Something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText('Custom Error Message')).toBeInTheDocument();
  });

  test('renders "No products found" when empty', () => {
    renderCollection({ ...mockContext, products: [] });
    expect(screen.getByText(/No products found/i)).toBeInTheDocument();
  });
});
