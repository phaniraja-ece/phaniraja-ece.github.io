## image2cppand

An online version of this tool is live at [https://phaniraja-ece.github.io/image2cppand/](http://phaniraja-ece.github.io/image2cppand/)


image2cppand is a simple tool to change images into byte arrays (or your array back into an image) for use with (monochrome) displays suchs as OLEDs, like those from Adafruit or Sparkfun. While searching for a way to generate these arrays, I mostly found links to a piece of Windows software. 

Alternatively you can also enter a byte array as input to turn it back into an image. This might be useful for debugging, or when you want to write the byte array yourself. You can access it by going to [over here](https://phaniraja-ece.github.io/byte2image)

### Running the tool
You can download and view the `index.html` file locally, or visit the online version at https://phaniraja-ece.github.io/image2cppand/

### Example Arduino code
You can find a simple Arduino example sketch [over here](https://github.com/phaniraja-ece/phaniraja-ece.github.io/image2cpp/blob/master/oled_example/oled_example.ino) in the repository.

### Screen types
I wrote the code with my 128x32 pixel monochrome OLED display in mind, but it should work with most similar displays. You might need to change some export settings; those are explained in the tool.


The example sketch is based on code by [Adafruit](https://github.com/adafruit). Dithering code from [stellar-L3N-etag](https://github.com/reece15/stellar-L3N-etag).

