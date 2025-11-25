# QR Student Attendance App

![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)

This repository contains the source code for the QR Student Attendance App, a mobile application designed to streamline the attendance process in educational institutions.

## ✨ Features

- **User Authentication:** Secure login for both students and instructors.
- **Role-Based Access:** Different dashboards and functionalities for students and instructors.
- **QR Code Generation:** Instructors can generate unique QR codes for each class session.
- **QR Code Scanning:** Students can scan the QR code to mark their attendance in real-time.
- **Attendance History:** View past attendance records and filter by date or course.
- **Profile Management:** Users can view and manage their profile information.

## 🛠️ Tech Stack

- **Framework:** [React Native](https://reactnative.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Navigation:** [React Navigation](https://reactnavigation.org/)
- **UI Toolkit:** React Native Paper
- **Backend:** Custom REST API)

## 🚀 Getting Started

To get a local copy up and running, please follow these steps.

### Prerequisites

Make sure you have the following installed on your development machine:
- [Node.js](https://nodejs.org/en/download/) (LTS version recommended)
- [npm](https://www.npmjs.com/get-npm) or [yarn](https://classic.yarnpkg.com/en/docs/install/)
- A mobile simulator (iOS or Android) or a physical device with the [Expo Go](https://expo.dev/client) app.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/devparmar15199/qr-student-app.git
    cd qr-student-app
    ```

2.  **Install dependencies:**
    ```sh
    npm install
    ```
    or
    ```sh
    yarn install
    ```

3.  **Set up environment variables:**
    If your project uses environment variables (e.g., for API keys), create a `.env` file in the root directory and add them.
    ```
    # .env
    API_BASE_URL="your_backend_api_url"
    ```

### Running the Application

1.  **Start the development server:**
    ```sh
    npm start
    ```
    or
    ```sh
    yarn start
    ```
2.  **Run on a device or simulator:**
    - Scan the QR code shown in the terminal with the Expo Go app on your phone.
    - Or, press `i` to run on the iOS simulator or `a` to run on the Android emulator.

## 📂 Project Structure

```
qr-student-app/
├── assets/         # Images, fonts, etc.
├── src/
│   ├── components/   # Reusable UI components
│   ├── navigation/   # App navigation stacks
│   ├── screens/      # Main screens of the app
│   ├── services/     # API calls and other services
│   ├── store/        # State management (e.g., Redux, Zustand)
│   ├── types/        # TypeScript type definitions
│   └── App.tsx       # Main app entry point
├── .env.example    # Environment variable template
├── package.json
└── tsconfig.json
```

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/NewFeature`)
3.  Commit your Changes (`git commit -m 'Add some NewFeature'`)
4.  Push to the Branch (`git push origin feature/NewFeature`)
5.  Open a Pull Request

---
Built by devparmar15199
