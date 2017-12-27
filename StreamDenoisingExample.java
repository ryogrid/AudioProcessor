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
            DataLine.Info info = new DataLine.Info(SourceDataLine.class,linearFormat);
            WavFile2.sourceDataLine = (SourceDataLine)AudioSystem.getLine(info);
            // ソースデータラインをオープンする
            WavFile2.sourceDataLine.open(linearFormat);
            WavFile2.sourceDataLine.start();            
            
            
            // Open the wav file specified as the first argument
            WavFile2 wavFile = WavFile2.openWavFile(new File(filename));
            
//            while(true){
//            	byte hoge[] = new byte[4];
//            	linearStream.read(hoge, 0, 4);
//            	
//            	sourceDataLine.write(hoge,0,4);
//            }
            
            // Display information about the wav file
            wavFile.display();
            int fs = (int)wavFile.getSampleRate();
            int validBits = wavFile.getValidBits();
            // Get the number of audio channels in the wav file
            int numChannels = wavFile.getNumChannels();
            int numFrames = (int)wavFile.getNumFrames();
            int samples = numFrames * numChannels;

            int splitFrames = 44100;
            double[] buffer = new double[samples];
            double[] buffer2 = new double[splitFrames * numChannels];
            double[][] splitChannel = new double[numChannels][splitFrames];

//            int framesRead;
//            framesRead = wavFile.readFrames(buffer2, splitFrames);
            
//            int pointer = 0;
//            byte hoge[] = new byte[4];
//            while(true){
//				hoge[0] = (byte)buffer[pointer];
//				hoge[1] = (byte)buffer[pointer+1];
//				hoge[2] = (byte)buffer[pointer+2];
//				hoge[3] = (byte)buffer[pointer+3];            	
//        	
//            	WavFile2.sourceDataLine.write(hoge,0,4);
//            	pointer += 4;
//            }
            
            // Close the wavFile            
            double[] enhancedSingle;
            double[][] enhanced;

            WavFile2 output = WavFile2.newWavFile(new File(justName+"_enhanced3.wav"), numChannels, numFrames, validBits, fs);

            Denoiser denoiser = new Denoiser(fs,0.4,9,2,8);
            if (numChannels == 1) {
                enhancedSingle =  denoiser.process(buffer);
                output.writeFrames(enhancedSingle, enhancedSingle.length);
            } else {
//				for (int i = 0; i < numFrames; i++) {
//					for (int k = 0; k < numChannels; k++) {
//						splitChannel[k][i] = buffer[i * numChannels + k];
//					}
//				}
//				enhanced = denoiser.process(splitChannel);
//
//				for (int i = 0; i < enhanced[0].length; i++) {
//					for (int k = 0; k < numChannels; k++) {
//						buffer[i * numChannels + k] = enhanced[k][i];
//					}
//
//				}				
//				output.writeFrames(buffer, buffer.length);
				
            	for(int j=0;j < numFrames;j+=splitFrames){
                    int framesRead;
                    framesRead = wavFile.readFrames(buffer2, splitFrames);
                    
            		for (int i = j; i < j+splitFrames; i++) {
            			for (int k = 0; k < numChannels; k++) {
//            				System.out.println("i " + Integer.toString(i));
//            				System.out.println("i-j" + Integer.toString(i-j));
//            				System.out.println("i * numChannels + k" + Integer.toString(i * numChannels + k));            				
            				if(i * numChannels + k < buffer2.length){
            					splitChannel[k][i-j] = buffer2[i * numChannels + k];            					
            				}            				
            			}
            		}
            		enhanced = denoiser.process(splitChannel);
             		for (int i = 0; i < enhanced[0].length; i++) {
            			for (int k = 0; k < numChannels; k++) {
            				buffer2[i * numChannels + k] = (byte)enhanced[k][i];
            			}
            		}
            		//sourceDataLine.write(buffer2,0,buffer2.length);
            		output.writeFrames(buffer2, splitFrames);
            	}
             }
            wavFile.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
    
}
