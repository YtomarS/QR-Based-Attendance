let students = JSON.parse(localStorage.getItem("students")) || [];
let attendance = JSON.parse(localStorage.getItem("attendance")) || [];
const clrBtn = document.getElementById("clrBtn");
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const photo = document.getElementById("photo");
const subject = document.getElementById("subject").value || "Not Selected";
const date = document.getElementById("date").value || new Date().toLocaleDateString();

let html5QrcodeScanner = null;
let cameraStream = null;

// ---------------- Generate QR ----------------
document.getElementById("generateBtn").addEventListener("click", () => {
  let name = document.getElementById("name").value.trim();
  let roll = document.getElementById("roll").value.trim();
  let qrContainer = document.getElementById("qrcode");
  qrContainer.innerHTML = "";

  if (!name || !roll) {
    alert("Please Enter both name and roll number");
    return;
  }

  const qrData = `${roll}|${name}`;
  new QRCode(qrContainer, {
    text: qrData,
    width: 180,
    height: 180,
  });

  if (!students.some((s) => s.roll === roll)) {
    students.push({ roll, name });
    localStorage.setItem("students", JSON.stringify(students));
  }

  const qrDisplayContainer = document.getElementById("qrDisplayContainer");
  const userInfo = document.getElementById("userInfo");
  userInfo.innerHTML = `<strong>Name:</strong> ${name} <br> <strong>Roll:</strong> ${roll}`;
  qrDisplayContainer.style.display = "block";

  document.getElementById("name").value = "";
  document.getElementById("roll").value = "";
  displayAttendance();
});

// ---------------- Start & Stop Camera ----------------
async function startCamera() {  

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = cameraStream;
    video.play();
  } catch (err) {
    console.error("Error accessing camera: ", err);
    alert("Unable to access camera. Please allow permissions.");
  }
}

function stopCamera() {
  if (cameraStream) {
    const tracks = cameraStream.getTracks();
    tracks.forEach((track) => track.stop());
    cameraStream = null;
  }
  video.srcObject = null;
}

// ---------------- Capture Image ----------------
function captureImage(roll, name) {
setTimeout(() => {
     canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL("image/png");
  photo.src = imageData;

  const isAlreadyPresent = attendance.some((a) => a.roll === roll);
  if (isAlreadyPresent) {
    alert(`${name}'s attendance already marked!`);
    return;
  }

  attendance.push({ roll, name, status: "Present", photo: imageData });
  localStorage.setItem("attendance", JSON.stringify(attendance));
  displayAttendance();
}, 500)}

// ---------------- QR Scan ----------------


function onScanSuccess(decodedText) {
  const [roll, name] = decodedText.split("|"); 
  if (!roll || !name) {
    alert("Invalid QR Code!");
    return;
  }

  const isAlreadyPresent = attendance.some((a) => a.roll === roll);
  if (isAlreadyPresent) {
    alert(`${name}'s attendance already done today!`);
    return;
  }

  captureImage(roll, name);
  alert("Attendance marked successfully!");
}

function onScanError(err) {
  console.warn(err);
}

// Start scanning on button click
document.getElementById("startScanBtn").addEventListener("click", async () => {
  document.getElementById("startScanBtn").style.display = "none"; 

  await startCamera();
  html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: 250 });
  html5QrcodeScanner.render(onScanSuccess, onScanError);
});

// Stop scanning
document.getElementById("stopScanBtn").addEventListener("click", () => {
  if (html5QrcodeScanner) {
    html5QrcodeScanner.clear();
    html5QrcodeScanner = null;
  }
  stopCamera();
  document.getElementById("stopScanBtn").style.display = "none";
  document.getElementById("startScanBtn").style.display = "inline-block";
});

// ---------------- Display Attendance ----------------
function displayAttendance() {
  const tbody = document.querySelector("#attendanceTable tbody");
  tbody.innerHTML = "";

  const data = JSON.parse(localStorage.getItem("attendance")) || [];

  data.forEach((item) => {
    const row = `
      <tr>
        <td>${item.roll}</td>
        <td>${item.name}</td>
        <td style="color: green; font-weight: bold;">${item.status}</td>
        <td>
          ${
            item.photo
              ? `<img src="${item.photo}" alt="photo">`
              : "—"
          }
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}
displayAttendance();

// ---------------- Download QR as Image ----------------
document.getElementById("downloadQrBtn").addEventListener("click", () => {
  const qrDisplayContainer = document.getElementById("qrDisplayContainer");
  html2canvas(qrDisplayContainer).then((canvas) => {
    const link = document.createElement("a");
    link.download = "qr_code.png";
    link.href = canvas.toDataURL();
    link.click();
  });
});

// ---------------- Clear Data ----------------
clrBtn.addEventListener("click", () => {
  if (confirm("Clear all attendance data?")) { 
    localStorage.removeItem("attendance");
    attendance = [];
    displayAttendance();
  }
});

// ---------------- Export Attendance to PDF ----------------
document.getElementById("pdfBtn").addEventListener("click", () => {
  const data = JSON.parse(localStorage.getItem("attendance")) || [];
 

  if (data.length === 0) {
    alert("No attendance data to export!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("QR Code Attendance Report", 14, 15);
  doc.setFontSize(12);
  doc.text(`Subject: ${subject}`, 14, 25);
  doc.text(`Date: ${date}`, 14, 32);
  doc.line(14, 35, 195, 35);

  const tableData = data.map((item, index) => [
    index + 1,
    item.roll,
    item.name,
    item.status,
  ]);

  doc.autoTable({
    startY: 40,
    head: [["S.No", "Roll No", "Name", "Status"]],
    body: tableData,
    theme: "grid",
  });

  doc.save(`Attendance_${subject}_${date}.pdf`);
});