let divSelectRoom = document.getElementById('selectRoom');
let inputRoomName = document.getElementById('roomName');
let btnGoRoom = document.getElementById('goRoom');
let divConsultingRoom = document.getElementById('consultingRoom');
let localVideo = document.getElementById('localVideo');
let remoteVideo = document.getElementById('remoteVideo');

//variables for feature videos
let roomName, localStream, remoteStream, rtcPeerConnection, isCaller;

//define the stun servers
const rtcConfig = {
  iceServers: [
    {'urls': 'stun:stun.services.mozilla.com'},
    {'urls': 'stun:stun.l.google.com:19302'}
  ]
};

const streamConstraints = {
  audio: true,
  video: true
};

const ws = new WebSocket('ws://localhost:5442/ws-test');

const sendMessage = (command, data) => {
  ws.send(JSON.stringify({command, data}));
};

btnGoRoom.onclick = () => {
  if (inputRoomName.value === '') {
    alert('Please enter a room name')
  } else {
    roomName = inputRoomName.value;
    sendMessage('create or join', {room: roomName});
    divSelectRoom.style = 'display: none';
    divConsultingRoom.style = 'display: block'
  }
};

const withRoomCheck = (cb) => (room, ...rest) => {
  if (room !== roomName) {
    console.warn('wrong room name', room);
    return;
  }

  cb(...rest);
};

const handleCreated = withRoomCheck(() => {
  navigator.mediaDevices.getUserMedia(streamConstraints)
      .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
        isCaller = true;
      })
      .catch(err => {
        console.log('An error occurred', err)
      })
});

const handleJoined = withRoomCheck(() => {
  navigator.mediaDevices.getUserMedia(streamConstraints)
      .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
        sendMessage('ready', roomName)
      })
      .catch(err => {
        console.log('An error occurred', err)
      })
});

const handleFull = withRoomCheck(() => {
  alert('The following session is full, please create another session or wait')
});

const handleReady = withRoomCheck(() => {
  if (!isCaller) {
    console.warn('not a caller, nothing to do on \'ready\'');
    return;
  }
  rtcPeerConnection = new RTCPeerConnection(rtcConfig);
  rtcPeerConnection.onicecandidate = onIceCandidate;
  rtcPeerConnection.ontrack = onAddStream;
  rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
  rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
  rtcPeerConnection.createOffer()
      .then(sessionDescription => {
        console.log('Sending offer', sessionDescription);
        rtcPeerConnection.setLocalDescription(sessionDescription)
            .then(() => {
              sendMessage('offer', {
                sdp: sessionDescription,
                room: roomName
              });
            });
      })
      .catch(err => {
        console.log(err)
      })
});

const handleOffer = withRoomCheck(({sdp}) => {
  if (isCaller) {
    console.warn('is caller, nothing to do on \'offer\'');
    return;
  }
  rtcPeerConnection = new RTCPeerConnection(rtcConfig);
  rtcPeerConnection.onicecandidate = onIceCandidate;
  rtcPeerConnection.ontrack = onAddStream;
  rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
  rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);
  console.log('Received offer', sdp);
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp))
      .then(() => {
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
              console.log('Sending answer', sessionDescription);
              rtcPeerConnection.setLocalDescription(sessionDescription)
                  .then(() => {
                    sendMessage('answer', {
                      sdp: sessionDescription,
                      room: roomName
                    });
                  });
            })
            .catch(err => {
              console.log(err)
            });
      });
});

const handleAnswer = withRoomCheck(({sdp}) => {
  console.log('Received answer', sdp);
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
});

const handleCandidate = withRoomCheck(event => {
  const candidate = new RTCIceCandidate(
      {
        sdpMLineIndex: event.label,
        candidate: event.candidate
      });
  console.log('Received candidate', candidate);
  rtcPeerConnection.addIceCandidate(candidate)
});

function onAddStream(event) {
  remoteVideo.srcObject = event.streams[0];
  remoteStream = event.streams[0]
}

function onIceCandidate(event) {
  if (event.candidate) {
    console.log('sending ice candidate', event.candidate);
    sendMessage('candidate', {
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      room: roomName
    })
  }
}

const handlersMap = {
  created: handleCreated,
  joined: handleJoined,
  full: handleFull,
  ready: handleReady,
  offer: handleOffer,
  answer: handleAnswer,
  candidate: handleCandidate
};

ws.onmessage = (evt) => {
  if (evt.data === 'ping') {
    return;
  }
  const jsonMsg = JSON.parse(evt.data);
  const handler = handlersMap[jsonMsg.command];
  handler?.(jsonMsg.data.room, jsonMsg.data);
};
