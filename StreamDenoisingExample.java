import java.io.*;
import java.util.Arrays;
import java.io.*;
import javax.sound.sampled.*;

public class StreamDenoisingExample {

	public static void main(String[] args) {
		try {
			String filename = "asakai60.wav";
			int pos = filename.lastIndexOf(".");
			String justName = pos > 0 ? filename.substring(0, pos) : filename;

			// 音声ファイルから入力ストリームを取得する
			AudioInputStream linearStream = AudioSystem.getAudioInputStream(new File(filename));
			AudioFormat linearFormat = linearStream.getFormat();
			System.out.println(linearFormat);
			// ソースデータラインを取得する
			DataLine.Info info = new DataLine.Info(SourceDataLine.class, linearFormat);
			WavFile2.sourceDataLine = (SourceDataLine) AudioSystem.getLine(info);
			// ソースデータラインをオープンする
			WavFile2.sourceDataLine.open(linearFormat);
			WavFile2.sourceDataLine.start();

			// Open the wav file specified as the first argument
			WavFile2 wavFile = WavFile2.openWavFile(new File(filename));

//			 while(true){
//				 byte hoge[] = new byte[4];
//				 linearStream.read(hoge, 0, 4);
//			
//				 WavFile2.sourceDataLine.write(hoge,0,4);
//			 }


			// Display information about the wav file
			wavFile.display();
			int fs = (int) wavFile.getSampleRate();
			int validBits = wavFile.getValidBits();
			// Get the number of audio channels in the wav file
			int numChannels = wavFile.getNumChannels();
			int numFrames = (int) wavFile.getNumFrames();
			int samples = numFrames * numChannels;

			// int splitFrames = 44100 * 5;
			int splitFrames = numFrames;
			double[] buffer = new double[samples];
			double[] buffer2 = new double[splitFrames * numChannels];
			double[][] splitChannel = new double[numChannels][splitFrames];

//            int framesRead;
//            framesRead = wavFile.readFrames(buffer, numFrames);
            
			// int pointer = 0;
			// byte hoge[] = new byte[4];
			// while(true){
			// hoge[0] = (byte)buffer[pointer];
			// hoge[1] = (byte)buffer[pointer+1];
			// hoge[2] = (byte)buffer[pointer+2];
			// hoge[3] = (byte)buffer[pointer+3];
			//
			// WavFile2.sourceDataLine.write(hoge,0,4);
			// pointer += 4;
			// }

			// Close the wavFile
			double[] enhancedSingle;
			double[][] enhanced;

			WavFile2 output = WavFile2.newWavFile(new File(justName + "_enhancedX.wav"), numChannels, numFrames,
					validBits, fs);

			Denoiser denoiser = new Denoiser(fs, 0.4, 9, 2, 8);
			if (numChannels == 1) {
				enhancedSingle = denoiser.process(buffer);
				output.writeFrames(enhancedSingle, enhancedSingle.length);
			} else {
//				 for (int i = 0; i < numFrames; i++) {
//					 for (int k = 0; k < numChannels; k++) {
//						 splitChannel[k][i] = buffer[i * numChannels + k];
//					 }
//				 }
//				 enhanced = denoiser.process(splitChannel);				
//				 for (int i = 0; i < enhanced[0].length; i++) {
//					 for (int k = 0; k < numChannels; k++) {
//						 buffer[i * numChannels + k] = enhanced[k][i];
//					 }				
//				 }
//				 output.writeFrames(buffer, buffer.length);

				double[] concated_buf = new double[0];
				for (int j = 0; j < numFrames; j += splitFrames) {
					int framesRead;
					framesRead = wavFile.readFrames(buffer2, splitFrames);

					for (int i = j; i < j + splitFrames; i++) {
						for (int k = 0; k < numChannels; k++) {
							// System.out.println("i " + Integer.toString(i));
							// System.out.println("i-j" +
							// Integer.toString(i-j));
							// System.out.println("i * numChannels + k" +
							// Integer.toString(i * numChannels + k));
							if (i * numChannels + k < buffer2.length) {
								splitChannel[k][i - j] = buffer2[i * numChannels + k];
							}
						}
					}
					enhanced = denoiser.process(splitChannel);
					//System.out.println(enhanced[0].length);
					for (int i = 0; i < enhanced[0].length; i++) {
						for (int k = 0; k < numChannels; k++) {
							buffer2[i * numChannels + k] = (byte) enhanced[k][i];
						}
					}
					concated_buf = concat_buf(concated_buf, buffer2);
				}
				System.out.println(concated_buf.length);
				output.writeFrames(concated_buf, concated_buf.length);
			}
			wavFile.close();
		} catch (Exception e) {
			e.printStackTrace();
		}
	}

	private static double[] concat_buf(double[] buf1, double[] buf2) {
		double[] ret_buf = new double[buf1.length + buf2.length];
		System.arraycopy(buf1, 0, ret_buf, 0, buf1.length);
		System.arraycopy(buf2, 0, ret_buf, buf1.length, buf2.length);
		return ret_buf;
	}
}
