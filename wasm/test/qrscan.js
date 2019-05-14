// Adapted from https://github.com/code-kotis/qr-code-scanner

var QRReader = {};

QRReader.active = false;
QRReader.webcam = null;
QRReader.canvas = null;
QRReader.ctx = null;
QRReader.decoder = null;
QRReader.last_scanned_raw = null;
QRReader.last_scanned_at = null;
// In milliseconds
QRReader.debounce_timeout = 750;

QRReader.setCanvas = () => {
  QRReader.canvas = document.createElement('canvas');
};

function setPhotoSourceToScan() {
  if (window.isMediaStreamAPISupported) {
    QRReader.webcam = document.querySelector('video');
  }
}

QRReader.init = (worker_path) => {
  var streaming = false;

  // Init Webcam + Canvas
  setPhotoSourceToScan();

  QRReader.setCanvas();
  QRReader.decoder = new Worker(worker_path);

  if (window.isMediaStreamAPISupported) {
    // Resize webcam according to input
    QRReader.webcam.addEventListener(
      'play',
      function(ev) {
        if (!streaming) {
          setCanvasProperties();
          streaming = true;
        }
      },
      false
    );
  } else {
    setCanvasProperties();
  }

  function setCanvasProperties() {
    QRReader.canvas.width = QRReader.webcam.scrollWidth;
    QRReader.canvas.height = QRReader.webcam.scrollHeight;
    // Moved this here, otherwise it's too small
    QRReader.ctx = QRReader.canvas.getContext('2d');
    //console.log("Set canvas width x height to " + QRReader.canvas.width + 'x' + QRReader.canvas.height);
  }

  function startCapture(constraints) {
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(stream) {
        QRReader.webcam.srcObject = stream;
        QRReader.webcam.setAttribute('playsinline', true);
        QRReader.webcam.setAttribute('controls', true);
        setTimeout(() => {
          document.querySelector('video').removeAttribute('controls');
        });
      })
      .catch(function(err) {
        console.log('Error occurred ', err);
        showErrorMsg();
      });
  }

  if (window.isMediaStreamAPISupported) {
    navigator.mediaDevices
      .enumerateDevices()
      .then(function(devices) {
        var device = devices.filter(function(device) {
          var deviceLabel = device.label.split(',')[1];
          if (device.kind == 'videoinput') {
            return device;
          }
        });

        var constraints;
        if (device.length > 1) {
          constraints = {
            video: {
              mandatory: {
                sourceId: device[1].deviceId ? device[1].deviceId : null
              }
            },
            audio: false
          };

          if (window.iOS) {
            constraints.video.facingMode = 'environment';
          }
          startCapture(constraints);
        } else if (device.length) {
          constraints = {
            video: {
              mandatory: {
                sourceId: device[0].deviceId ? device[0].deviceId : null
              }
            },
            audio: false
          };

          if (window.iOS) {
            constraints.video.facingMode = 'environment';
          }

          startCapture(constraints);
        } else {
          startCapture({ video: true });
        }
      })
      .catch(function(error) {
        showErrorMsg();
        console.error('Error occurred : ', error);
      });
  }

  function showErrorMsg() {
    window.noCameraPermission = true;
    document.querySelector('.custom-scanner').style.display = 'none';
    alert('Unable to access the camera');
  }
};

/**
 * \brief QRReader Scan Action
 * Call this to start scanning for QR codes.
 *
 * \param A function(scan_result)
 */
QRReader.scan = function(callback) {
  QRReader.active = true;

  function onDecoderMessage(msg) {
    //console.log("on decode message");
    //console.log(msg);
    if (msg.data != 'done') {
      var qrid = msg.data['payload_string'];
      let right_now = Date.now();
      if (qrid != QRReader.last_scanned_raw || QRReader.last_scanned_at < right_now - QRReader.debounce_timeout) {
        QRReader.active = false;
        QRReader.last_scanned_raw = qrid;
        QRReader.last_scanned_at = right_now;
        callback(qrid);
      } else if (qrid == QRReader.last_scanned_raw) {
        QRReader.last_scanned_at = right_now;
      }
    }
    setTimeout(newDecoderFrame, 0);
  }

  // Start QR-decoder
  function newDecoderFrame() {
    //console.log("newDecoderFrame 1");
    if (!QRReader.active) return;
    try {
      //console.log("newDecoderFrame");
      QRReader.ctx.drawImage(QRReader.webcam, 0, 0, QRReader.canvas.width, QRReader.canvas.height);
      var imgData = QRReader.ctx.getImageData(0, 0, QRReader.canvas.width, QRReader.canvas.height);

      if (imgData.data) {
        QRReader.decoder.postMessage(imgData);
      }
    } catch (e) {
      // Try-Catch to circumvent Firefox Bug #879717
      if (e.name == 'NS_ERROR_NOT_AVAILABLE') setTimeout(newDecoderFrame, 0);
      console.log("Error");
      console.log(e);
    }
  }

  QRReader.decoder.onmessage = onDecoderMessage;

  newDecoderFrame();
};
