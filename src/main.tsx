import { render } from 'preact';
import { Router, Route } from 'preact-router';
import './style.css';
import { NavBar } from './components/NavBar';
import { EvolvePage } from './components/EvolvePage';
import { MyShapesPage } from './components/MyShapesPage';
import { ConfirmDialog } from './components/ConfirmDialog';

function App() {
  return (
    <>
      <NavBar />
      <Router>
        <Route path="/" component={EvolvePage} />
        <Route path="/my-shapes" component={MyShapesPage} />
      </Router>
      <div class="toast" id="toast" />
      <ConfirmDialog />
    </>
  );
}

render(<App />, document.getElementById('app')!);
