import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import CitizenPortal from "./citizen/CitizenPortal";
import "./citizen/styles/CitizenPortal.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <CitizenPortal />
    </BrowserRouter>
  </React.StrictMode>
);