function start_scanning(worker_path) {
  //To check the device and add iOS support
  window.iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0;
  window.isMediaStreamAPISupported = navigator && navigator.mediaDevices && 'enumerateDevices' in navigator.mediaDevices;
  window.noCameraPermission = false;

  var videoElement = $('#video-preview');
  var scanLog = $('#scan-log');
  var last_scanned_raw = null;

  QRReader.init(worker_path); //To initialize QR Scanner

  // Wait a second and scan
  if (window.isMediaStreamAPISupported) {
    setTimeout(() => { scan(); }, 1000);
  }

  //Scan
  function scan() {
    QRReader.scan(result => {
      if (result != last_scanned_raw) {
        // For debouncing
        last_scanned_raw = result;
        scanLog.prepend("<span>" + result + "</span><br>");
        setTimeout(() => { scan(); }, 50);
      } else {
        // wait a second and try again
        setTimeout(() => { scan(); }, 1000);
      }
    });
  }
}
