importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.0.0/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyBXNUOiNv3QjQRjooFRcooMeTOKRZ2MJCg",
    authDomain: "helplink-10237.firebaseapp.com",
    projectId: "helplink-10237",
    storageBucket: "helplink-10237.firebasestorage.app",
    messagingSenderId: "347386147615",
    appId: "1:347386147615:web:2134d3702e21243b3b362a",
    measurementId: "G-GYVZSMKDWE"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(
        payload.notification.title,
        {
            body: payload.notification.body,
            icon: "/HelpLink.png"
        }
    );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    clients.openWindow("/")
  );
});