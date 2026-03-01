import { render } from 'preact';
import { Router, Route } from 'preact-router';
import './style.css';
import { NavBar } from './components/NavBar';
import { EvolvePage } from './components/EvolvePage';
import { MyShapesPage } from './components/MyShapesPage';
import { GalleryPage } from './components/GalleryPage';
import { DetailPage } from './components/DetailPage';
import { AboutPage } from './components/AboutPage';
import { FunctionGalleryPage } from './components/FunctionGalleryPage';
import { ConfirmDialog } from './components/ConfirmDialog';

function App() {
  return (
    <>
      <NavBar />
      <Router>
        <Route path="/" component={EvolvePage} />
        <Route path="/my-shapes" component={MyShapesPage} />
        <Route path="/explore" component={GalleryPage} />
        <Route path="/shape/:id" component={DetailPage} />
        <Route path="/about" component={AboutPage} />
        <Route path="/functions" component={FunctionGalleryPage} />
      </Router>
      <div class="toast" id="toast" />
      <ConfirmDialog />
    </>
  );
}

render(<App />, document.getElementById('app')!);
