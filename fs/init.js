load('api_config.js');
load('api_dht.js');
load('api_events.js');
load('api_gpio.js');
load('api_http.js')
load('api_net.js');
load('api_sys.js');
load('api_timer.js');
//load('api_i2c.js');

//
// Variables
//

let ledPin = Cfg.get('pins.led') || 2;
let rainPin = Cfg.get('pins.rain') || 15;
let dhtPin =  Cfg.get('pins.dht') || 4;
let push_token = Cfg.get('push.token');
let push_user = Cfg.get('push.user');
let push_sound = Cfg.get('push.sound');

let i2c_addr = 0x44;
//let i2c_handle = I2C.get();

let raining=0;
let temp = 0;
let hum = 0;
let debounce = false;

print('LED GPIO:', ledPin, 'rain GPIO:', rainPin, 'dht GPIO:', dhtPin);

//
// Setup
//

// Use a timer interrupt to poll sensors (and built-in LED) every 10 seconds
GPIO.set_mode(ledPin, GPIO.MODE_OUTPUT);





//
// Functions
//
function read_i2c_temp() {
  print("Writing to I2c")
  i2c.write(i2c_handle,i2c_addr,[0x2c,0x06],2,false);
  print("Delay 500ms")
  Sys.usleep(500*1000);
  print("Read from i2c")
  let data = I2C.read(bus, i2c_addr, 6, true);
  print(data);
}

function poll_sensors() {
  //
  // Read the sensors and print the status (for diagnostics)
  //
  print("poll_sensors");
  GPIO.toggle(ledPin);
  raining = !GPIO.read(rainPin);
  //read_i2c_temp();
  //temp = dht.getTemp();
  //hum = dht.getHumidity();
  
  print((raining ? 'RAINY' : 'Dry'), 'temp=', temp, 'hum=', hum);
}


function push_message(title, message) {
  //
  // Send a message to the Pushover notification service
  //
  print('push message', title, message);

  HTTP.query({
    url: 'https://api.pushover.net/1/messages.json',
    data: { token: push_token,
	    user: push_user,
	    message: message,
	    title: title,
	    sound: push_sound
	    
	  },
    success: function(body, full_http_msg) { print('push result', body); },
    error: function(err) { print('push error', err); },  // Optional
  });
  print('push sent')
}


function rain_event() {
  //
  // Respond to a rain event.
  //
  // Send a push notification
  print("rain_event");
  push_message('Rain Alarm', 'It\'s raining, get the washing in!');
}

function wifi_event(ev, evdata, arg) {

  //
  // Monitor network connectivity.
  //
  let evs = '???';
  if (ev === Net.STATUS_DISCONNECTED) {
    evs = 'DISCONNECTED';
  } else if (ev === Net.STATUS_CONNECTING) {
    evs = 'CONNECTING';
  } else if (ev === Net.STATUS_CONNECTED) {
    evs = 'CONNECTED';
  } else if (ev === Net.STATUS_GOT_IP) {
    evs = 'GOT_IP';
  }
  print('== Net event:', ev, evs);
}


//
// Main Loop
//

// (there is no main loop, everything happens via the interrupts configured above)


Timer.set(1000 /* 1 sec */, Timer.REPEAT, poll_sensors, null);

// Install an interrupt for immediate rain detection.
// Ignore repeated events within 1000ms (in case of "sensor bounce")
GPIO.set_button_handler(rainPin, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 1000, rain_event, null);

// Install an interrupt to report changes in wifi status
Event.addGroupHandler(Net.EVENT_GRP, wifi_event, null);

