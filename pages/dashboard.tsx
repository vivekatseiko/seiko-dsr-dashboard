import React, { useState, useEffect } from "react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/dashboard?storeCode=all");
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Dashboard Summary</h1>
      {loading ? (
        <p>Loading...</p>
      ) : data ? (
        <div>
          <p>Total Sales: ₹{(data.totalSales / 100000).toFixed(2)}L</p>
          <p>Units: {data.totalQuantity}</p>
          <p>Discount: ₹{(data.totalDiscounts / 100000).toFixed(2)}L</p>
          <p>Avg Disc %: {data.averageDiscount}%</p>
          <p>ASP: ₹{data.asp}</p>
        </div>
      ) : (
        <p>No data</p>
      )}
    </div>
  );
}

