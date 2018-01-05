import java.io.*;
import java.util.Arrays;
import java.io.*;
import javax.sound.sampled.*;

public class TextSampleCreate {

	public static void main(String[] args) {
		try {
			//System.out.println((long)(Long.MAX_VALUE >> (64 - 12)));
			
			String filename = "rnnnoise/asakai60.wav";
			int pos = filename.lastIndexOf(".");
			String justName = pos > 0 ? filename.substring(0, pos) : filename;

			// Open the wav file specified as the first argument
			WavFile wavFile = WavFile.openWavFile(new File(filename));

			// Display information about the wav file
			wavFile.display();
			int fs = (int) wavFile.getSampleRate();
			int validBits = wavFile.getValidBits();
			// Get the number of audio channels in the wav file
			int numChannels = wavFile.getNumChannels();
			int numFrames = (int) wavFile.getNumFrames();
			
			System.out.println("validBits " + validBits);
			double[] buffer = new double[numFrames*2];

            int framesRead;
            framesRead = wavFile.readFrames(buffer, numFrames);
            
            String[] write_buf = new String[numFrames];
            for(int i=0;i<numFrames;i++) {
            	write_buf[i] = Double.toString(buffer[2*i]);
            }
            String result_str = String.join(",", write_buf);
            
            BufferedOutputStream bfo = new BufferedOutputStream(new FileOutputStream(new File("./sample60.txt")));
            bfo.write(result_str.getBytes());
            bfo.flush();
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
