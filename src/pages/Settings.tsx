import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
export default function Settings(): null {
  const navigate = useNavigate();
  useEffect(() => { navigate("/admin", { replace: true }); }, [navigate]);
  return null;
}
