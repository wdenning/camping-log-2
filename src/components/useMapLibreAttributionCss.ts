import { useEffect } from "react";

const useMapLibreAttributionCss = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .maplibregl-ctrl-attrib, .maplibregl-ctrl-attrib a {
        background: #10281a !important;
        color: #e6ffe6 !important;
        border: none !important;
      }
      .maplibregl-ctrl-attrib {
        font-family: sans-serif !important;
        font-size: 13px !important;
        border-radius: 6px !important;
        box-shadow: none !important;
        padding: 4px 10px !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);
};

export default useMapLibreAttributionCss;
