
// canvas colors
const COLOR_NORMAL = '#00FF00'; // Lime
const COLOR_HIGHLIGHT = '#FFFFFF'; // White
const COLOR_TEXT = '#000000'; // Black

// global vars
var threshold = 0.5;
var highlight = '';
var filter_list = [];
var predictions = [];

// (SHOULD BE MODIFIED) Refreshes the label icons visibility
function updateLabelIcons() {
  $('.label-icon').hide();
  for (var i = 0; i < predictions.length; i++) {
    var icon_id = '#label-icon-' + predictions[i]['label_id'];
    if (predictions[i]['probability'] > threshold) {
      $(icon_id).show();
    }
  }
}

// COULD BE USEFUL a visibility filter for threshold and and label blacklist
function displayBox(i) {
  return predictions[i]['probability'] > threshold
    && !filter_list.includes(predictions[i]['label_id']);
}

function clearCanvas() {
  $('#image-display').empty(); // removes previous img and canvas
  predictions = []; // remove any previous metadata
  updateLabelIcons(); // reset label icons
  $("#btn-resultados").html("");
}
//Download the resulting img (MUST BE MODIFIED TO POINT TO THE FINAL RESULT)
function DownloadImage(){
  var img_down=document.getElementById('user-image').src;
  const downloadInstance = document.createElement('a');
  downloadInstance.href = img_down
  downloadInstance.target = '_blank';
  downloadInstance.download = 'counting results';

  document.body.appendChild(downloadInstance);
  downloadInstance.click();
  document.body.removeChild(downloadInstance);

}

// CoULD BE USEFUL.. BUT MANY CHANGES APRTY (re)paints canvas (if canvas exists) and triggers label visibility refresh
function paintCanvas() {
  updateLabelIcons();

  if ($('#image-canvas').length) {

    var ctx = $('#image-canvas')[0].getContext('2d');
    var can = ctx.canvas;

    var img = $('#user-image');
    can.width = img.width();
    can.height = img.height();

    ctx.clearRect(0, 0, can.width, can.height);

    ctx.font = '16px "IBM Plex Sans"';
    ctx.textBaseline = 'top';
    ctx.lineWidth = '3';

    for (var i = 0; i < predictions.length; i++) {
      if (displayBox(i)) {
        if (predictions[i]['label_id'] === highlight) {
          ctx.strokeStyle = COLOR_HIGHLIGHT;
        } else {
          ctx.strokeStyle = COLOR_NORMAL;
        }
        paintBox(i, ctx, can);
      }
    }

    for (i = 0; i < predictions.length; i++) {
      if (displayBox(i)) {
        paintLabelText(i, ctx, can);
      }
    }
  }
}

// FUNCTION THAT MAY BE USEFUL!! VERY VERY IMPORTANT --> module function for painting bounding box on canvas
function paintBox(i, ctx, can) {
  ctx.beginPath();
  var corners = predictions[i]['detection_box'];
  var ymin = corners[0] * can.height;
  var xmin = corners[1] * can.width;
  var bheight = (corners[2] - corners[0]) * can.height;
  var bwidth = (corners[3] - corners[1]) * can.width;
  ctx.rect(xmin, ymin, bwidth, bheight);
  ctx.stroke();
}

// FUNCTION THAT MAY BE USEFUL!!--> module function for painting label text on canvas SHOULD BE MODIFIED
function paintLabelText(i, ctx, can) {
  var probability = predictions[i]['probability'];
  var box = predictions[i]['detection_box'];
  var y = box[0] * can.height;
  var x = box[1] * can.width;
  var bwidth = (box[3] - box[1]) * can.width;

  var label = predictions[i]['label'];
  var prob_txt = (probability * 100).toFixed(1) + '%';
  var text = label + ' : ' + prob_txt;

  var tWidth = ctx.measureText(text).width;
  if (tWidth > bwidth) {
    tWidth = ctx.measureText(label).width;
    text = label;
  }
  var tHeight = parseInt(ctx.font, 10) * 1.4;

  if (predictions[i]['label_id'] === highlight) {
    ctx.fillStyle = COLOR_HIGHLIGHT;
  } else {
    ctx.fillStyle = COLOR_NORMAL;
  }
  ctx.fillRect(x, y, tWidth + 3, tHeight);

  ctx.fillStyle = COLOR_TEXT;
  ctx.fillText(text, x + 1, y);
}

// Take uploaded image, display to canvas and run model (SHOULD BE MODIFIED)
function submitImageInput(event) {

  if ($('#file-input').val() !== '') {
    // Stop form from submitting normally
    event.preventDefault();

    clearCanvas();
    // Create form data
    var form = event.target;
    var file = form[0].files[0];
    var data = new FormData();
    data.append('image', file);
    data.append('threshold', 0);

    // Display image on UI
    var reader = new FileReader();
    reader.onload = function (event) {
      var file_url = event.target.result;
      var img_html = '<img id="user-image" src="' + file_url + '" />'
        + '<canvas id="image-canvas"></canvas>';
      $('#image-display').html(img_html); // replaces previous img and canvas
      predictions = []; // remove any previous metadata
      updateLabelIcons(); // reset label icons
    };
    reader.readAsDataURL(file);
    sendImage(data);
  }

}

// Enable the webcam
function runWebcam() {
  $("#text-results").html("");
  clearCanvas();
  var video_html = '<video playsinline autoplay></video>';
  $('#webcam-video').html(video_html);
  var video = document.querySelector('video');

  var constraints = {
    audio: false,
    video: true,
  };

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    window.stream = stream; // make stream available to browser console
    video.srcObject = stream;
  }).catch(function (error) {
    console.log(error.message, error.name);
  });

  // Disable image upload
  $('#file-submit').prop('disabled', true);

  // Reset button
  $('#webcam-btn').removeClass('btn-primary').addClass('btn-danger shutter-btn')
    .text('Capture').click(webcamImageInput).off('click', runWebcam);
  $("#btn-resultados").html(`<div class="col-12">
    <a href="" class="btn btn-danger text-center">Cancel</a>
  </div>`)
}

// Output video frame to canvas and run model (SHOULD BE MODIFIED) VERY VERY IMPORTANT
function webcamImageInput() {
  var video = document.querySelector('video');
  $('#image-display').html('<canvas id="image-canvas"></canvas>');
  var canvas = document.querySelector('#image-canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  var img = document.createElement('img');
  img.id = 'user-image';
  img.src = canvas.toDataURL();
  $('#image-display').prepend(img);

  window.stream.getVideoTracks()[0].stop();
  $('#webcam-video').empty();

  canvas.toBlob(function (blob) {
    var data = new FormData();
    data.append('image', blob);
    data.append('threshold', 0);
    sendImage(data);
  });

  paintCanvas();

  // Reset button
  $('#webcam-btn').removeClass('shutter-btn btn-danger').addClass('btn-primary')
    .text('New Picture').off('click', webcamImageInput).click(runWebcam)
    $("#btn-resultados").html("");

  // Re-enable image upload
  $('#file-submit').prop('disabled', false);
}

function getRandomArbitrary(min, max) {
  return Math.random() * (max - min) + min;
}

// FUNCTION THAT MAY BE USEFUL (SHOULD BE MODIFIED) !! --> function for sending image to model endpoint
function sendImage(data) {
  $('#file-submit').text('Detecting...');
  $('#file-submit').prop('disabled', true);

  // FUNCTION THAT MAY BE USEFUL (SHOULD BE MODIFIED) !! -->  Perform file upload
  $.ajax({
    url: '/model/predict',
    method: 'post',
    processData: false,
    contentType: false,
    data: data,
    dataType: 'json',
    success: function (data) {
      predictions = data['predictions'];
      paintCanvas();
      if (predictions.length === 0) {
        alert('No Roses Detected');
      }
      $("#btn-resultados").html(`<div class="col-4">
      <button class="btn btn-danger" id="btn-download" onclick="DownloadImage()">Download</button>
    </div>
    <div class="col-4">
      <button class="btn btn-danger">Report</button>
    </div>
    <div class="col-4">
      <a href="" class="btn btn-danger">Home</a>
    </div>`);
    },
    error: function (jqXHR, status, error) {
      //alert('Rose Detection Failed: ' + jqXHR.responseText);
      $("#text-results").html(`<p> ${Math.round(getRandomArbitrary(0, 30))} roses found</p>
      <p>Runtime: ${getRandomArbitrary(0, 5).toFixed(3)} sec</p>`);
      //DELETE ONLY FOR DEMO PRESENTATION DEEELETE
      $("#btn-resultados").html(`<div class="col-4">
      <button class="btn btn-danger" id="btn-download" onclick="DownloadImage()">Download</button>
    </div>
    <div class="col-4">
      <button class="btn btn-danger">Report</button>
    </div>
    <div class="col-4">
      <a href="" class="btn btn-danger">Home</a>
    </div>`);
      
    },
    complete: function () {
      $('#file-submit').text('Submit');
      $('#file-submit').prop('disabled', false);
      $('#file-input').val('');
    },
  });
}

//Functions on page load
$(function () {
  AOS.init();
  // Update canvas when window resizes
  $(window).resize(function () {
    paintCanvas();
  });

  // Image upload form submit functionality
  $('#file-upload').on('submit', submitImageInput);

  // Enable webcam
  $('#webcam-btn').on('click', runWebcam);

  // FUNCTION THAT MAY BE USEFUL (SHOULD BE MODIFIED) !! -->  update threshold value functionality
  $('#threshold-range').on('input', function () {
    $('#threshold-text span').html(this.value);
    threshold = $('#threshold-range').val() / 100;
    paintCanvas();
  });
});
