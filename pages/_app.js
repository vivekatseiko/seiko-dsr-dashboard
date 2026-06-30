import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navigation from "../components/Navigation";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("sessionToken");
    const userRole = localStorage.getItem("userRole");

    const publicPages = ["/login"];

    if (!token && !publicPages.includes(router.pathname)) {
      router.push("/login");
    } else {
      setRole(userRole || null);
      setLoading(false);
    }
  }, [router.pathname, router]);

  // Check role-based access
  useEffect(() => {
    if (loading) return;

    const adminOnlyPages = ["/approvals"];

    if (adminOnlyPages.includes(router.pathname) && role !== "admin") {
      router.push("/dashboard");
    }
  }, [role, router.pathname, loading]);

  if (loading) {
    return <Component {...pageProps} />;
  }

  if (!role) {
    return <Component {...pageProps} />;
  }

  return (
    <>
      <Navigation role={role} />
      <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}
