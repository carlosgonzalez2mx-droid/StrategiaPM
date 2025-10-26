/**
 * Mock de react-router-dom para tests
 */

const React = require('react');

const mockNavigate = jest.fn();
const mockUseNavigate = () => mockNavigate;
const mockUseParams = () => ({});
const mockUseLocation = () => ({
  pathname: '/',
  search: '',
  hash: '',
  state: null,
});

const BrowserRouter = ({ children }) => React.createElement('div', null, children);
const Routes = ({ children }) => React.createElement('div', null, children);
const Route = ({ children }) => React.createElement('div', null, children);
const Navigate = () => React.createElement('div', null);
const Link = ({ children, to }) => React.createElement('a', { href: to }, children);

module.exports = {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate: mockUseNavigate,
  useParams: mockUseParams,
  useLocation: mockUseLocation,
};
