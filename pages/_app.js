import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "../styles/Home.module.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const storedRole = localStorage.getItem("userRole");
      const storedEmail = localStorage.getItem("userEmail");

      if (!storedRole) {
        router.push("/login");
        return;
      }

      setUserRole(storedRole);
      setUserName(storedEmail || "User");
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userStoreCode");
    router.push("/login");
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>;
  }

  if (!userRole) {
    return <Component {...pageProps} />;
  }

  // Don't show navigation on login page
  if (router.pathname === "/login") {
    return <Component {...pageProps} />;
  }

  return (
    <div className={styles.appContainer}>
      {/* Header Navigation */}
      <nav className={styles.navbar}>
        <div className={styles.navBrand}>
          <h2>Seiko DSR Dashboard</h2>
        </div>

        <div className={styles.navLinks}>
          <Link href="/dashboard" className={router.pathname === "/dashboard" ? styles.active : ""}>
            📊 Summary
          </Link>

          <Link href="/analytics" className={router.pathname === "/analytics" ? styles.active : ""}>
            📈 Analytics
          </Link>

          <Link href="/store-performance" className={router.pathname === "/store-performance" ? styles.active : ""}>
            🏪 Store Performance
          </Link>

          <Link href="/upload" className={router.pathname === "/upload" ? styles.active : ""}>
            📤 Upload
          </Link>

          {userRole === "admin" && (
            <>
              <Link href="/targets-management" className={router.pathname === "/targets-management" ? styles.active : ""}>
                🎯 Targets
              </Link>

              <Link href="/approvals" className={router.pathname === "/approvals" ? styles.active : ""}>
                ✅ Approvals
              </Link>
            </>
          )}
        </div>

        <div className={styles.navRight}>
          <span className={styles.userInfo}>
            👤 {userName} ({userRole})
          </span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className={styles.mainContent}>
        <Component {...pageProps} />
      </main>
    </div>
  );
}
