/* 
    if running on ip address with lan connection make sure to enable to chrom flags
    chrome://flags
    Insecure origins treated as secure - enable and add your ip address
*/

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const callButton = document.getElementById("callButton");
const muteAudioButton = document.getElementById("muteAudioButton");
const muteVideoButton = document.getElementById("muteVideoButton");
const addUsers = document.getElementById("adduser");
let userId;
let localStream;

const servers = {
	iceServers: [
		{
			urls: [
				"stun:stun1.l.google.com:19302",
				"stun:stun2.l.google.com:19302",
			],
		},
	],
};

const peerConnection = new RTCPeerConnection(servers);
const ws = new WebSocket("ws://192.168.0.227:443"); // Replace with your server URL

// Add local media stream
navigator.mediaDevices
	.getUserMedia({
		video: {
			width: { ideal: 720 }, // Set the preferred video width
			height: { ideal: 480 }, // Set the preferred video height
			frameRate: { ideal: 24 }, // Set the preferred frame rate
		},
		audio: true,
	})
	.then((stream) => {
		localStream = stream;
		localVideo.srcObject = localStream;
		localStream
			.getTracks()
			.forEach((track) => peerConnection.addTrack(track, localStream));
	})
	.catch((error) => console.error("Error accessing media devices:", error));

// Handle WebSocket events
ws.onopen = () => {
	console.log("WebSocket connection established");
};

ws.onmessage = (event) => {
	const data = JSON.parse(event.data);
	const { type, payload, callerId } = data;
	console.log(type, callerId);
	if (type === "newuser") {
		console.log(type);
	}
	if (type === "offer") {
		peerConnection
			.setRemoteDescription(new RTCSessionDescription(payload))
			.then(() => peerConnection.createAnswer())
			.then((answer) => {
				peerConnection.setLocalDescription(answer);
				ws.send(
					JSON.stringify({
						type: "answer",
						payload: answer,
						callerId: userId,
					}),
				);
			})
			.catch((error) => console.error("Error creating answer:", error));
	} else if (type === "answer") {
		peerConnection.setRemoteDescription(new RTCSessionDescription(payload));
	} else if (type === "candidate") {
		peerConnection.addIceCandidate(new RTCIceCandidate(payload));
	}
};

// Handle peer connection events
peerConnection.onicecandidate = (event) => {
	if (event.candidate) {
		ws.send(
			JSON.stringify({
				type: "candidate",
				payload: event.candidate,
				callerId: userId,
			}),
		);
	}
};

peerConnection.onaddstream = (event) => {
	remoteVideo.srcObject = event.stream;
};

callButton.addEventListener("click", () => {
	peerConnection
		.createOffer()
		.then((offer) => {
			peerConnection.setLocalDescription(offer);
			ws.send(
				JSON.stringify({
					type: "offer",
					payload: offer,
					callerId: userId,
				}),
			);
		})
		.catch((error) => console.error("Error creating offer:", error));
});

addUsers.addEventListener("click", () => {
	userId = document.getElementById("user").value;
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(
			JSON.stringify({
				type: "newuser",
				payload: null,
				callerId: userId,
			}),
		);
	} else {
		console.error("WebSocket connection is not open");
	}
});

muteAudioButton.addEventListener("click", () => {
	const audioTracks = localStream.getAudioTracks();
	audioTracks.forEach((track) => {
		track.enabled = !track.enabled;
	});
});

muteVideoButton.addEventListener("click", () => {
	const videoTracks = localStream.getVideoTracks();
	videoTracks.forEach((track) => {
		track.enabled = !track.enabled;
	});
});
