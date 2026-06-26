import React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import styles from "../styles/Navigation.module.css";

interface NavigationProps {
  role?: string;
}

export default function Navigation({ role }: NavigationProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const isActive = (path: string) => router.pathname === path;

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContainer}>
        <div className={styles.navBrand}>
          <h1>Seiko DSR Dashboard</h1>
        </div>

        <ul className={styles.navMenu}>
          <li>
            <Link href="/dashboard">
              <a className={isActive("/dashboard") ? styles.active : ""}>
                📊 Summary
              </a>
            </Link>
          </li>

          <li>
            <Link href="/analytics">
              <a className={isActive("/analytics") ? styles.active : ""}>
                📈 Analytics
              </a>
            </Link>
          </li>

          <li>
            <Link href="/store-performance">
              <a className={isActive("/store-performance") ? styles.active : ""}>
                🏪 Store Performance
              </a>
            </Link>
          </li>

          <li>
            <Link href="/upload">
              <a className={isActive("/upload") ? styles.active : ""}>
                📤 Upload
              </a>
            </Link>
          </li>

          {role === "admin" && (
            <li>
              <Link href="/approvals">
                <a className={isActive("/approvals") ? styles.active : ""}>
                  ✅ Approvals
                </a>
              </Link>
            </li>
          )}
        </ul>

        <div className={styles.navRight}>
          <span className={styles.roleLabel}>
            {role === "admin" ? "🔐 Admin" : "📤 Manager"}
          </span>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
