import React, { useState, useEffect, useRef } from "react";
import Canvas from 'react-native-canvas'
import { StyleSheet, Text, View, Dimensions } from "react-native";
import * as tf from "@tensorflow/tfjs";
import "@tensorflow/tfjs-react-native";
import { cameraWithTensors, bundleResourceIO } from "@tensorflow/tfjs-react-native";
import { Camera } from "expo-camera";
import * as cocoSsd from '@tensorflow-models/coco-ssd';


const TensorCamera = cameraWithTensors(Camera);

const { width, height } = Dimensions.get('window');

// const modelJson = require('./assets/mobilenet/model.json')
// const modelWeight = require('./assets/mobilenet/group1-shard1of1.bin')
// const modelWeight1 = require('./assets/hand/group1-shard1of2.bin')
// const modelWeight2 = require('./assets/hand/group1-shard2of2.bin')

export default function App() {
  const [isTfReady, setIsTfReady] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [model, setModel] = useState(null);
  const canvas = useRef(null);
  let context = useRef(null)


  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      tf.env().set('WEBGL_PACK_DEPTHWISECONV', false);
      await tf
        .ready()
        .then((a) => {
          console.log(tf.getBackend());
          setIsTfReady(true);
        })
        .catch((e) => console.log("hata", e));
      tf.getBackend();

      // const model = await tf.loadGraphModel(bundleResourceIO(modelJson, modelWeight)).catch((e) => {
      //   console.log("[LOADING ERROR] info", e);
      //   setModel(null);
      // });
      // setIsModelReady(true);
      // setModel(model);


      const model2 = await cocoSsd.load();
      setIsModelReady(true);
      setModel(model2)



    })();
  }, []);
  console.log("isTfReady :", isTfReady);
  console.log("isModelReady", isModelReady);

  function handleCameraStream(images) {
    const loop = async () => {
      // const nextImageTensor = tf.cast(images.next().value, 'float32');
      const nextImageTensor = images.next().value;
      // const expandedTensor = tf.expandDims(nextImageTensor, 0);

      if (!model || !nextImageTensor) throw new Error('no model')

      model.detect(nextImageTensor)
        .then((predictions) => {
          //console.log(predictions);

          drawRectangle(predictions, nextImageTensor);
        })
        .catch((err) => {
          console.log(err);
        });
      requestAnimationFrame(loop);
    }
    loop();
  }

  function drawRectangle(
    predictions,
    nextImageTensor
  ) {
    if (!context.current || !canvas.current) {
      console.log("no context or canvas");
      return;
    }

    console.log(predictions);

    const scaleWidth = width / nextImageTensor.shape[1];
    const scaleHeight = height / nextImageTensor.shape[0];

    const flipHorizontal = Platform.OS === "ios" ? false : true;

    context.current.clearRect(0, 0, width, height);

    for (const prediction of predictions) {
      const [x, y, width, height] = prediction.bbox;

      const boundingBoxX = flipHorizontal
        ? canvas.current.width - x * scaleWidth - width * scaleWidth
        : x * scaleWidth;
      const boundingBoxY = y * scaleHeight;

      context.current.strokeRect(
        boundingBoxX,
        boundingBoxY,
        width * scaleWidth,
        height * scaleHeight
      );
      context.current.font = "14px Arial"
      context.current.fillText(
        prediction.class,
        boundingBoxX + 5,
        boundingBoxY - 5
      );
    }
  }

  const handleCanvas = async (can) => {
    if (can) {
      can.width = width;
      can.height = height;
      const ctx = can.getContext("2d");
      context.current = ctx;
      ctx.strokeStyle = "blue";
      ctx.fillStyle = 'white';
      ctx.lineWidth = 3;
      canvas.current = can;
    }
  };


  let textureDims;
  if (Platform.OS === 'ios') {
    textureDims = {
      height: 1920,
      width: 1080,
    };
  } else {
    textureDims = {
      height: 1200,
      width: 1600,
    };
  }

  if (!isTfReady) {
    return (<View style={styles.container}><Text>Tf is not ready </Text></View>)
  }
  if (!model) {
    return (<View style={styles.container}><Text>No model</Text></View>)
  }

  return (
    <View style={styles.container}>
      <TensorCamera
        style={styles.camera}
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}
        resizeHeight={200}
        resizeWidth={152}
        resizeDepth={3}
        onReady={handleCameraStream}
        autorender={true}
        useCustomShadersToResize={false}
      />
      <Canvas
        style={styles.canvas}
        ref={handleCanvas}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  camera: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  canvas: {
    position: "absolute",
    zIndex: 1000000,
    width: "100%",
    height: "100%",
  },
});

