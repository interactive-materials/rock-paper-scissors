import aruco from '../aruco/index.js';

class DetectionManager {
  constructor(canvas, video) {
    this.canvas = canvas;
    this.ctx = this.canvas.getContext('2d');
    this.video = video;
    this.detector = new aruco.Detector();
  }

  detect(dt, feedParams, detectionParams) {
    if (this.video && this.video.readyState === 4) {
      if (this.video.clientWidth > 20 && this.canvas.width !== this.video.clientWidth) {
        this.canvas.width = this.video.clientWidth;
        this.canvas.height = this.video.clientHeight;
      }

      // apply filter here
      this.ctx.filter = `contrast(${(100 + Math.floor(feedParams.contrast)) / 100})
      brightness(${(100 + Math.floor(feedParams.brightness)) / 100})
      grayscale(${Math.floor(feedParams.grayscale) / 100})`;

      if (feedParams.flip) {
        this.ctx.save();
        this.ctx.translate(this.canvas.width, 0);
        this.ctx.scale(-1, 1);
        // Render video frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
      } else {
        // Render video frame
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
      }
  
      let imageData = this.ctx.getImageData(0,0, this.canvas.width, this.canvas.height);
      let m = [this.detector.detect(imageData, detectionParams), dt, this.canvas.width, this.canvas.height];
      return m;
    } else {
      return [[], dt, this.canvas.width, this.canvas.height];
    }
  }   
}

export default DetectionManager;
