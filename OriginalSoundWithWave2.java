import java.io.*;
import java.util.Arrays;
import java.io.*;
import javax.sound.sampled.*;

public class OriginalSoundWithWave2 {

	public static void main(String[] args) {
		try {
			//System.out.println((long)(Long.MAX_VALUE >> (64 - 12)));
			
			String filename = "rnnnoise/asakai60.wav";
			int pos = filename.lastIndexOf(".");
			String justName = pos > 0 ? filename.substring(0, pos) : filename;

			// 髻ｳ螢ｰ繝輔ぃ繧､繝ｫ縺九ｉ蜈･蜉帙せ繝医Μ繝ｼ繝�繧貞叙蠕励☆繧�
			AudioInputStream linearStream = AudioSystem.getAudioInputStream(new File(filename));
			AudioFormat linearFormat = linearStream.getFormat();
			System.out.println(linearFormat);
			// 繧ｽ繝ｼ繧ｹ繝�繝ｼ繧ｿ繝ｩ繧､繝ｳ繧貞叙蠕励☆繧�
			DataLine.Info info = new DataLine.Info(SourceDataLine.class, linearFormat);
			WavFile2.sourceDataLine = (SourceDataLine) AudioSystem.getLine(info);
			// 繧ｽ繝ｼ繧ｹ繝�繝ｼ繧ｿ繝ｩ繧､繝ｳ繧偵が繝ｼ繝励Φ縺吶ｋ
			WavFile2.sourceDataLine.open(linearFormat);
			WavFile2.sourceDataLine.start();

			// Open the wav file specified as the first argument
			WavFile2 wavFile = WavFile2.openWavFile(new File(filename));

			// Display information about the wav file
			wavFile.display();
			int fs = (int) wavFile.getSampleRate();
			int validBits = wavFile.getValidBits();
			// Get the number of audio channels in the wav file
			int numChannels = wavFile.getNumChannels();
			int numFrames = (int) wavFile.getNumFrames();
			int samples = numFrames * numChannels;
			
			System.out.println("validBits " + validBits);
			

			WavFile2 output = WavFile2.newWavFile(new File(justName + "_txt.wav"), numChannels, numFrames,
					validBits, fs);
			
			int framesRead;
			double [] sample_arr = new double[samples];
            framesRead = wavFile.readFrames(sample_arr, numFrames);
			
			double [] buffer = new double[4];
			
			for(int i=0;i<sample_arr.length;i+=4) {
				buffer[i%4] = sample_arr[i];
				buffer[i%4+1] = sample_arr[i+1];
				buffer[i%4+2] = sample_arr[i+2];
				buffer[i%4+3] = sample_arr[i+3];
				output.writeFrames(buffer, 2);
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
