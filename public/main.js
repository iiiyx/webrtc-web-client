let divSelectRoom = document.getElementById('selectRoom')
let inputRoomName = document.getElementById('roomName')
let btnGoRoom = document.getElementById('goRoom')
let divConsultingRoom = document.getElementById('consultingRoom')
let localVideo = document.getElementById('localVideo')
let remoteVideo = document.getElementById('remoteVideo')

//variables for feature videos
let roomName, localStream, remoteStream, rtcPeerConnection, isCaller

//define the stun servers
const iceServers = {
    'iceServer': [
        {'urls': 'stun:stun.services.mozilla.com'},
        {'urls': 'stun:stun.l.google.com:19302'}
    ]
}

const streamConstraints = {
    audio: true,
    video: true
}

const socket = io()

btnGoRoom.onclick = () => {
    if(inputRoomName.value === '')
    {
        alert ("Please enter a room name")
    } else {
        roomName = inputRoomName.value
        socket.emit('create or join', roomName)
        divSelectRoom.style = "display: none"
        divConsultingRoom.style = "display: block"
    }
}

socket.on('created', room => 
{
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream
            localVideo.srcObject = stream
            isCaller = true
        })
        .catch(err => {
            console.log('An error ocurred', err)
        })
})

socket.on('joined', room => 
{
    navigator.mediaDevices.getUserMedia(streamConstraints)
        .then(stream => {
            localStream = stream
            localVideo.srcObject = stream      
            socket.emit('ready', roomName)      
        })
        .catch(err => {
            console.log('An error ocurred', err)
        })
})

socket.on('full', room =>
{
    alert('The following session is full, please create another session or wait')
})

socket.on('ready',  () =>
{
    if(isCaller)
    {
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate = onIceCandidate
        rtcPeerConnection.ontrack = onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream)
        rtcPeerConnection.createOffer()
            .then(sessionDescription => {
                console.log('Sending offer', sessionDescription)            
                rtcPeerConnection.setLocalDescription(sessionDescription)
                socket.emit('offer', {
                    type: 'offer',
                    sdp: sessionDescription,
                    room: roomName
                })
            
            })
            .catch(err => {
                console.log(err)
            })
    }
})

socket.on('offer',  event =>
{
    if(!isCaller)
    {
        rtcPeerConnection = new RTCPeerConnection(iceServers)
        rtcPeerConnection.onicecandidate = onIceCandidate
        rtcPeerConnection.ontrack = onAddStream
        rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream)
        rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream)
        console.log('Recieved offer', event)            
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
        rtcPeerConnection.createAnswer()
            .then(sessionDescription => {
                console.log('Sending answer', sessionDescription)            
                rtcPeerConnection.setLocalDescription(sessionDescription)
                socket.emit('answer', {
                    type: 'answer',
                    sdp: sessionDescription,
                    room: roomName
                })
            })
            .catch(err => {
                console.log(err)
            })
    }
})

socket.on('answer', event => 
{
    console.log('Recieved answer', event)            
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

socket.on('candidate', event => 
{
    const candidate = new RTCIceCandidate(
    {
      sdpMLineIndex: event.label,
      candidate: event.candidate  
    })
    console.log('Recieved candidate', candidate)
    rtcPeerConnection.addIceCandidate(candidate)
})

function onAddStream(event)
{
    remoteVideo.srcObject = event.streams[0]
    remoteStream = event.streams[0]
}
function onIceCandidate(event)
{
    if(event.candidate)
    {
        console.log('sending ice candidate', event.candidate)
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate,
            room: roomName
        })
    }
}