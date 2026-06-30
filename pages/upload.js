import { useState } from "react";
import { useRouter } from "next/router";
import styles from "../styles/Upload.module.css";

export default function Upload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage("Reading Excel file...");
    setMessageType("info");

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          setMessage("Loading Excel library...");

          // Load XLSX library
          const script = document.createElement("script");
          script.src = "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js";
          script.onerror = () => {
            setMessage("❌ Failed to load Excel library. Please try again.");
            setMessageType("error");
            setLoading(false);
            return;
          };

          script.onload = async () => {
            try {
              setMessage("Parsing Excel file...");

              const XLSX = window.XLSX;
              if (!XLSX) {
                throw new Error("XLSX library failed to load");
              }

              const workbook = XLSX.read(event.target.result, { type: "array" });
              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);

              if (!jsonData || jsonData.length === 0) {
                setMessage("❌ Excel file is empty");
                setMessageType("error");
                setLoading(false);
                return;
              }

              setMessage("Detecting store code...");

              const firstRow = jsonData[0];
              let storeCode = null;

              if
