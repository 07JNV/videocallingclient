import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import VOIP from "./componenets/voIP/VOIP.jsx"; 
import Home from "./componenets/landingPage/landingPage.jsx";

function App() {
  return (
    <Router>
      <div>
        <Routes>
          <Route path="/" element={<Home />} /> 
          <Route path="/voip" element={<VOIP />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
