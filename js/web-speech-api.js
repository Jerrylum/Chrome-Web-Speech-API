
function diff_algorithm(raw_input, split_eng_word = true) {
  let input = raw_input.sort((a,b) => b.length - a.length);;
  if (input.length == 0 || input[0].length == 0) return [];

  let rtn = [];
  let buf_str = "";
  let buf_eng = /[A-Za-z]/.test(input[0][0]);
  
  let index = new Array(input.length).fill(0);

  while (index[0] < input[0].length) {
    let str_0_char = input[0][index[0]];   
    if (input.every((val, i) => 
                    (!i || val[index[i]] == str_0_char) &&
                    (split_eng_word || !(buf_eng != (buf_eng = /[A-Za-z]/.test(val[index[i]])) && 
                                         buf_eng == true))
       )) {
      index.forEach((_, i) => index[i]++);
      buf_str += str_0_char;
      continue;
    }

    rtn.push([buf_str]);
    buf_str = "";

    let all_base_end = input.length;
    let the_best_find_index = [];
    let the_best_find_total = 100000000;

    input.forEach((base_str, base) => {
      let k = index[base] + 1;
      for (; k < base_str.length; k++) {
        if (!split_eng_word && /[A-Za-z]/.test(base_str[k])) continue;
        let find_index = new Array(input.length).fill(0);
        let find_total = 0;

        let all_find = input.every((val, j) => {
          find_index[j] = val.indexOf(base_str[k], index[j]);
          find_total = Math.max(find_total, find_index[j] - index[j]);
          return find_index[j] != -1;
        });

        if (all_find && find_total < the_best_find_total) {
          the_best_find_index = find_index;
          the_best_find_total = find_total;
          break;
        }
      }

      all_base_end -= !(k < base_str.length);
    });
    
    let buf = [];
    if (all_base_end == 0) {
      input.forEach((val, i) => buf.push(val.substring(index[i])));
      rtn.push(buf);
      return rtn;
    }
    input.forEach((val, i) => buf.push(val.substring(index[i], index[i] = the_best_find_index[i])));
    rtn.push(buf);
  }
  
  rtn.push([buf_str]);    
  return rtn;
}

function filter_duplicate(input) {
  return input.map(x => [...new Set(x)]).filter(x => x.length != 0 && (x.length != 1 || x[0] != ""));
}

var messages = {
  "start": {
    msg: 'Click on the microphone icon and begin speaking.',
    class: 'alert-success'},
  "speak_now": {
    msg: 'Speak now.',
    class: 'alert-success'},
  "no_speech": {
    msg: 'No speech was detected. You may need to adjust your <a href="//support.google.com/chrome/answer/2693767" target="_blank">microphone settings</a>.',
    class: 'alert-danger'},
  "no_microphone": {
    msg: 'No microphone was found. Ensure that a microphone is installed and that <a href="//support.google.com/chrome/answer/2693767" target="_blank">microphone settings</a> are configured correctly.',
    class: 'alert-danger'},
  "allow": {
    msg: 'Click the "Allow" button above to enable your microphone.',
    class: 'alert-warning'},
  "denied": {
    msg: 'Permission to use microphone was denied.',
    class: 'alert-danger'},
  "blocked": {
    msg: 'Permission to use microphone is blocked. To change, go to chrome://settings/content/microphone',
    class: 'alert-danger'},
  "upgrade": {
    msg: 'Web Speech API is not supported by this browser. It is only supported by <a href="//www.google.com/chrome">Chrome</a> version 25 or later on desktop and Android mobile.',
    class: 'alert-danger'},
  "stop": {
      msg: 'Stop listening, click on the microphone icon to restart',
      class: 'alert-success'},
  "copy": {
    msg: 'Content copy to clipboard successfully.',
    class: 'alert-success'},
}

var final_transcript = '';
var recognizing = false;
var ignore_onend;
var start_timestamp;
var recognition;

$( document ).ready(function() {
  for (var i = 0; i < langs.length; i++) {
    select_language.options[i] = new Option(langs[i][0], i);
  }
  select_language.selectedIndex = 6;
  updateCountry();
  select_dialect.selectedIndex = 6;
  
  if (!('webkitSpeechRecognition' in window)) {
    upgrade();
  } else {
    showInfo('start');  
    start_button.style.display = 'inline-block';
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.maxAlternatives = 20;

    recognition.onstart = function() {
      recognizing = true;
      showInfo('speak_now');
      start_img.src = 'images/mic-animation.gif';
    };

    recognition.onerror = function(event) {
      if (event.error == 'no-speech') {
        start_img.src = 'images/mic.gif';
        showInfo('no_speech');
        ignore_onend = true;
      }
      if (event.error == 'audio-capture') {
        start_img.src = 'images/mic.gif';
        showInfo('no_microphone');
        ignore_onend = true;
      }
      if (event.error == 'not-allowed') {
        if (event.timeStamp - start_timestamp < 100) {
          showInfo('blocked');
        } else {
          showInfo('denied');
        }
        ignore_onend = true;
      }
    };

    recognition.onend = function() {
      recognizing = false;
      if (ignore_onend) {
        return;
      }
      start_img.src = 'images/mic.gif';
      if (!final_transcript) {
        showInfo('start');
        return;
      }
      showInfo('stop');
      if (window.getSelection) {
        window.getSelection().removeAllRanges();
        var range = document.createRange();
        range.selectNode(document.getElementById('final_span'));
        window.getSelection().addRange(range);
      }
    };

    recognition.onresult = function(event) {
      var interim_transcript = '';
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          var res = [].concat(...event.results[i]).map(({transcript})=>transcript);
          console.log(filter_duplicate(diff_algorithm(res, false)));
          console.log(event.results)

          final_transcript += event.results[i][0].transcript;
        } else {
          interim_transcript += event.results[i][0].transcript;
        }
      }
      final_transcript = capitalize(final_transcript);
      final_span.innerHTML = linebreak(final_transcript);
      interim_span.innerHTML = linebreak(interim_transcript);
    };
  }
});


function updateCountry() {
  for (var i = select_dialect.options.length - 1; i >= 0; i--) {
    select_dialect.remove(i);
  }
  var list = langs[select_language.selectedIndex];
  for (var i = 1; i < list.length; i++) {
    select_dialect.options.add(new Option(list[i][1], list[i][0]));
  }
  select_dialect.style.visibility = list[1].length == 1 ? 'hidden' : 'visible';
}


function upgrade() {
  start_button.style.visibility = 'hidden';
  showInfo('upgrade');
}

var two_line = /\n\n/g;
var one_line = /\n/g;
function linebreak(s) {
  return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
}

var first_char = /\S/;
function capitalize(s) {
  return s.replace(first_char, function(m) { return m.toUpperCase(); });
}

$("#copy_button").click(function () {
  if (recognizing) {
    recognizing = false;
    recognition.stop();
  }
  setTimeout(copyToClipboard, 500);
  
});

function copyToClipboard() {
  if (document.selection) { 
      var range = document.body.createTextRange();
      range.moveToElementText(document.getElementById('results'));
      range.select().createTextRange();
      document.execCommand("copy"); 
  
  } else if (window.getSelection) {
      var range = document.createRange();
       range.selectNode(document.getElementById('results'));
       window.getSelection().addRange(range);
       document.execCommand("copy");
  }
  showInfo('copy');
}

$("#start_button").click(function () {
  if (recognizing) {
    recognition.stop();
    return;
  }
  final_transcript = '';
  recognition.lang = select_dialect.value;
  recognition.start();
  ignore_onend = false;
  final_span.innerHTML = '';
  interim_span.innerHTML = '';
  start_img.src = 'images/mic-slash.gif';
  showInfo('allow');
  start_timestamp = event.timeStamp;
});

$("#select_language").change(function () {
  updateCountry();
});

function showInfo(s) {
  if (s) {
    var message = messages[s];
    $("#info").html(message.msg);
    $("#info").removeClass();
    $("#info").addClass('alert');
    $("#info").addClass(message.class);
  } else {
    $("#info").removeClass();
    $("#info").addClass('d-none');
  }
}
