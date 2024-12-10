import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";
import "./voip.css";
import { IoMdMicOff } from "react-icons/io";
import { IoMdMic } from "react-icons/io";
import { FaVideo } from "react-icons/fa6";
import { FaVideoSlash } from "react-icons/fa6";
import { MdScreenShare } from "react-icons/md";
import { BsFillRecordFill } from "react-icons/bs";
import { BsRecord } from "react-icons/bs";
import { IoMdDownload } from "react-icons/io";

const socket = io.connect("http://localhost:8000");

const App = () => {
  const [myEmail, setMyEmail] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [stream, setStream] = useState();
  const [screenStream, setScreenStream] = useState(null);
  const [screenStream1, setScreenStream1] = useState(false);
  const [combinedStream, setCombinedStream] = useState(null);
  const [combinedStream1, setCombinedStream1] = useState(null);
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [registeredAs, setRegisteredAs] = useState(null);
  const [callinguser, setcallinguser] = useState(false);
  const [remoteuser, setremoteuser] = useState(null);
  const [localuser, setlocaluser] = useState(null);
  const [remotescreen, setremotescreen] = useState(null);
  const [localscreen, setlocalscreen] = useState(null);

  const myVideo = useRef();
  const newref = useRef(null);
  const userVideo = useRef();
  const screenVideo = useRef();
  const connectionRef = useRef();
  const mediaRecorderRef = useRef();

  const [peer, setPeer] = useState(null);
  const [capture,setCapture]=useState(false);

  const oncapture = () => {
    setCapture((prevCapture) => !prevCapture);
  
    if (!capture) {
      // Start capturing (when capture is false, toggle to true)
      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: { ideal: "environment" }, // Use 'ideal' instead of 'exact' for more flexibility
          },
          audio: true,
        })
        .then((newStream) => {
          setStream(newStream);
          // If you are using the setLocalUser state, set it here
          setlocaluser(newStream);
          if (myVideo.current) {
            myVideo.current.srcObject = newStream;
            myVideo.current.style.transform = "scaleX(-1)";
          }
          // Assuming createCombinedStream combines the camera stream with another (screen stream)
          createCombinedStream(newStream, screenStream);
        })
        .catch((err) => {
          console.error("Error accessing media devices:", err);
          // Fallback to the front-facing camera if the rear-facing camera is not available
          if (err.name === "OverconstrainedError") {
            navigator.mediaDevices
              .getUserMedia({
                video: { facingMode: "user" }, // Fall back to front camera if rear is unavailable
                audio: true,
              })
              .then((newStream) => {
                setStream(newStream);
                setlocaluser(newStream);
                if (myVideo.current) {
                  myVideo.current.srcObject = newStream;
                }
                createCombinedStream(newStream, screenStream);
              })
              .catch((fallbackErr) => {
                console.error("Error accessing media devices after fallback:", fallbackErr);
              });
          }
        });
    } else {
      // Stop capturing (when capture is true, toggle to false)
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach((track) => track.stop()); // Stop the tracks (video and audio)
        setStream(null); // Nullify the stream
        // Reset the video source to null
        if (myVideo.current) {
          myVideo.current.srcObject = null;
        }
      }
    }
  };
  
  useEffect(() => {
   
    
    // here calling user
    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      setCallerSignal(data.signal);
    });

    //sharing screen part

    socket.on("screenReceived", (data) => {
      const newpeer = new SimplePeer({
        initiator: false,
        trickle: false,
      });

      newpeer.on("signal", (signalData) => {
        socket.emit("inresponse", {
          signal: signalData,
          to: data.from,
        });
      });

      setScreenStream1(true);
     
      newpeer.on("stream", (stream) => {
        console.log(stream);
        setremotescreen(stream);
        if (screenVideo.current) {
          screenVideo.current.srcObject = stream;
          console.log(screenVideo);
        }
      });

      newpeer.signal(data.signal);
    });

    socket.on("responsefromreceiver", (signal) => {
      console.log("signal received");
    });

    // share screen part ends
    socket.on("me", (id) => {
      console.log("Registered with ID:", id);
    });
  }, [capture]);

  const createCombinedStream = (userStream, screenStream) => {
    const combinedStream = new MediaStream();

    userStream.getTracks().forEach((track) => {
      combinedStream.addTrack(track);
    });

    if (screenStream) {
      screenStream.getTracks().forEach((track) => {
        combinedStream.addTrack(track);
      });
    }

    setCombinedStream(combinedStream);
  };

 

  //check email in database

  const [isemailpresent, setisemailpresent] = useState(false);

  //check email in database part end here

  const registerUser = async () => {
    
    setisemailpresent(true);
    if (myEmail) {
      socket.emit("register", myEmail);
      setRegisteredAs(`Registered as ${myEmail}`);
    } else {
      alert("Please enter your email.");
    }
  };

  const callUser = async () => {
    
    if (targetEmail) {
      const peer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: combinedStream,
      });

      peer.on("signal", (data) => {
        socket.emit("callUser", {
          userToCall: targetEmail,
          signalData: data,
          from: myEmail,
        });
      });

      peer.on("stream", (stream) => {
        setremoteuser(stream);

        if (userVideo.current) {
          userVideo.current.srcObject = stream;
        }
      });

      socket.on("callAccepted", (signal) => {
        setCallAccepted(true);
        peer.signal(signal);
      });

      connectionRef.current = peer;
      setPeer(peer);
    } else {
      alert("Please enter the email of the user you want to call.");
    }
    setcallinguser(true);
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new SimplePeer({
      initiator: false,
      trickle: false,
      stream: combinedStream,
    });

    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      setremoteuser(stream);

      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
    setPeer(peer);
  };

  const toggleMic = () => {
    setMicOn(!micOn);
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  };

  const toggleVideo = () => {
    setVideoOn(!videoOn);
    stream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
  };

  const setrelo = ({ remoteuser, localuser }) => {
    userVideo.current.srcObject = remoteuser;
    myVideo.current.srcObject = localuser;
  };



  const shareScreen = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      createCombinedStream(displayStream, screenStream);

      setlocalscreen(displayStream);
      screenVideo.current.srcObject = displayStream;

      const newPeer = new SimplePeer({
        initiator: true,
        trickle: false,
        stream: combinedStream,
      });

      

      newPeer.on("signal", (data) => {
        socket.emit("screenShare", {
          to: targetEmail,
          signalData: data,
          from: myEmail,
        });
      });

      newPeer.on("stream", (remoteStream) => {
        console.log("Remote stream received");
      });
    } catch (err) {
      console.error("Error getting display media:", err);
    }
  };



  const handlescreenshare = () => {
    if (screenStream1 === true) {
      setScreenStream1(false);
      return;
    } else {
      setScreenStream1(true);
    }
    shareScreen();
  };

  useEffect(() => {
    if (remoteuser && localuser) {
      setrelo({ remoteuser, localuser });
    }
    if (screenStream1 === false) {
      if (remoteuser && localuser) {
        setrelo({ remoteuser, localuser });
      }
    }
  }, [screenStream1]);

  //recording part

  const handleDataAvailable = (event) => {
    if (event.data.size > 0) {
      setRecordedChunks((prev) => [...prev, event.data]);
    }
  };

  const startRecording = async () => {
    try {
      // If a recording is already in progress, stop it before starting a new one
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        await stopRecording();
      }

      // Capture the screen stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // Capture the user's audio stream
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Combine screen stream and audio stream
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);

      const options = { mimeType: "video/webm; codecs=vp9" };
      const mediaRecorder = new MediaRecorder(combinedStream, options);

      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.start();
      setRecording(true);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.onstop = () => {
        screenStream.getTracks().forEach((track) => track.stop());
        audioStream.getTracks().forEach((track) => track.stop());
      };
    } catch (error) {
      console.error("Error starting screen recording:", error);
    }
  };

  const stopRecording = async () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecording(false);

      // Wait for mediaRecorder.onstop to complete
      await new Promise((resolve) => {
        mediaRecorderRef.current.onstop = () => {
          resolve();
        };
      });
    }
  };

  const downloadRecording = () => {
    if (recordedChunks.length > 0) {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = "meeting-recording.webm";
      a.click();
      window.URL.revokeObjectURL(url);
      setRecordedChunks([]);
    }
  };

  //recording part ends

  //button disable or enable
  const [isButtonEnabled, setIsButtonEnabled] = useState(true);
  const [style, setStyle] = useState({ cursor: "pointer" });

  // const checkTime = () => {
  //   const now = new Date();
  //   const hours = now.getHours();
  //   if (hours >= 18 && hours <= 24) {
  //     setIsButtonEnabled(true);
  //     setStyle({ cursor: "pointer" });
  //   } else {
  //     setStyle({ cursor: "not-allowed" });
  //     alert("call between 6PM and 12AM");
  //     setIsButtonEnabled(false);
  //   }
  // };

  // useEffect(() => {
  //   checkTime();
  //   const intervalId = setInterval(checkTime, 60 * 1000); // Check every minute
  //   return () => clearInterval(intervalId); // Clean up the interval on component unmount
  // }, []);

  // console.log(screenVideo)

  // useEffect(() => {
  //   if (screenVideo.current) {
  //     screenVideo.current.onloadedmetadata = () => {
  //       console.log(screenVideo.current.videoWidth);
  //       console.log(screenVideo.current.videoHeight);
  //     };
  //   }
  // }, [screenVideo]);


  console.log("remotescreen",remotescreen);

  return (
    <div>
    <button onClick={oncapture}>capture</button>
      {!isemailpresent && (
        <div className="enter_your_email">
          <input
            type="text"
            value={myEmail}
            placeholder="Enter your email"
            onChange={(e) => setMyEmail(e.target.value)}
          />
          <button onClick={registerUser}>Login</button>
        </div>
      )}

      {registeredAs && isemailpresent && (
        <div className="local_email">{registeredAs}</div>
      )}

      {!callAccepted ? (
        <div className="before_accepting">
          <div className="myvideo">
            <video
              playsInline
              muted
              ref={myVideo}
              autoPlay
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          {!callinguser && !receivingCall && !callAccepted && (
            <div className="calluser_email">
              <div className="calluser_btn_input">
                <input
                  className="input_user_call"
                  type="text"
                  value={targetEmail}
                  placeholder="Enter email to call"
                  onChange={(e) => setTargetEmail(e.target.value)}
                />
                <button
                  // disabled={!isButtonEnabled}
                  style={style}
                  className="btn1"
                  onClick={callUser}
                >
                  Call
                </button>
              </div>
            </div>
          )}

          {callinguser && (
            <div className="calluser_email">calling {targetEmail}.........</div>
          )}

          {receivingCall && !callAccepted && (
            <div className="calluser_email">
              <div>
                <h1>{caller} is calling...</h1>
                <button onClick={answerCall} className="btn1">
                  Answer
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        !screenStream1 && (
          <div className="before_accepting after_accepting">
            <div className="myvideo">
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                style={{ width: "100%", height: "100%" }}
              />
            </div>

            <div className="remote_user">
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
        )
      )}

      {callAccepted && !screenStream1 ? (
        <div className="controls">
          {micOn ? (
            <button onClick={toggleMic} className="btn2">
              <IoMdMic size="30px" />
            </button>
          ) : (
            <button onClick={toggleMic} className="btn11">
              <IoMdMicOff size="30px" />
            </button>
          )}
          {videoOn ? (
            <button onClick={toggleVideo} className="btn2">
              <FaVideo size="30px" />
            </button>
          ) : (
            <button onClick={toggleVideo} className="btn11">
              <FaVideoSlash size="30px" />
            </button>
          )}

          <button onClick={handlescreenshare} className="btn3">
            <MdScreenShare size="30px" />
          </button>
          {recording ? (
            <button onClick={stopRecording} className="btn2">
              <BsFillRecordFill size="30px" />
            </button>
          ) : (
            <button onClick={startRecording} className="btn11">
              <BsRecord size="30px" />
            </button>
          )}
          {recordedChunks.length > 0 && (
            <button onClick={downloadRecording} className="btn2">
              <IoMdDownload size="30px" />
            </button>
          )}
        </div>
      ) : null}

      {screenStream1 && (
        <div className="streaming">
          <div className="stream_box">
            <video
              playsInline
              ref={screenVideo}
              autoPlay
              style={{ width: "100%", height: "100%", borderRadius: "8px" }}
            />
          </div>

          <div className="after_stream">
            <div className="myvideo_stream">
              <video
                playsInline
                muted
                ref={myVideo}
                autoPlay
                style={{ width: "100%", height: "100%", borderRadius: "8px" }}
              />
            </div>

            <div className="remote_user_stream">
              <video
                playsInline
                ref={userVideo}
                autoPlay
                style={{ width: "100%", height: "100%", borderRadius: "8px" }}
              />
            </div>

            <div className="controls">
              {micOn ? (
                <button onClick={toggleMic} className="btn2">
                  <IoMdMic size="30px" />
                </button>
              ) : (
                <button onClick={toggleMic} className="btn11">
                  <IoMdMicOff size="30px" />
                </button>
              )}
              {videoOn ? (
                <button onClick={toggleVideo} className="btn2">
                  <FaVideo size="30px" />
                </button>
              ) : (
                <button onClick={toggleVideo} className="btn11">
                  <FaVideoSlash size="30px" />
                </button>
              )}

              <button onClick={handlescreenshare} className="btn2">
                <MdScreenShare size="30px" />
              </button>
              {recording ? (
                <button onClick={stopRecording} className="btn2">
                  <BsFillRecordFill size="30px" />
                </button>
              ) : (
                <button onClick={startRecording} className="btn11">
                  <BsRecord size="30px" />
                </button>
              )}
              {recordedChunks.length > 0 && (
                <button onClick={downloadRecording} className="btn2">
                  <IoMdDownload size="30px" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
