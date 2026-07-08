import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

struct Job {
    let input: String
    let output: String
    let crop: CGRect
    let size: CGSize
}

let jobs = [
    Job(
        input: "/Users/lenty/Desktop/Current-Photo/jpg/jpg-260219-日本中部遊/20260220-LTY07875.jpg",
        output: "public/couple/snow-square.jpg",
        crop: CGRect(x: 700, y: 300, width: 1700, height: 1700),
        size: CGSize(width: 960, height: 960)
    ),
    Job(
        input: "/Users/lenty/Downloads/20251116-LTY04518.jpg",
        output: "public/couple/walk-square.jpg",
        crop: CGRect(x: 100, y: 800, width: 1800, height: 1800),
        size: CGSize(width: 960, height: 960)
    ),
    Job(
        input: "/Users/lenty/Downloads/20251116-LTY04348.jpg",
        output: "public/couple/forest-square.jpg",
        crop: CGRect(x: 250, y: 1200, width: 1700, height: 1700),
        size: CGSize(width: 960, height: 960)
    ),
    Job(
        input: "/Users/lenty/Desktop/Current-Photo/jpg/jpg-260219-日本中部遊/20260220-LTY07875.jpg",
        output: "public/couple/hero-wide.jpg",
        crop: CGRect(x: 250, y: 250, width: 2600, height: 1500),
        size: CGSize(width: 1170, height: 675)
    ),
]

func writeJPEG(_ image: CGImage, to path: String, quality: CGFloat = 0.86) throws {
    let url = URL(fileURLWithPath: path)
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil) else {
        throw NSError(domain: "CropPhotos", code: 1, userInfo: [NSLocalizedDescriptionKey: "Cannot create destination for \(path)"])
    }

    let options = [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary
    CGImageDestinationAddImage(destination, image, options)

    if !CGImageDestinationFinalize(destination) {
        throw NSError(domain: "CropPhotos", code: 2, userInfo: [NSLocalizedDescriptionKey: "Cannot write \(path)"])
    }
}

func resize(_ image: CGImage, to size: CGSize) throws -> CGImage {
    let width = Int(size.width)
    let height = Int(size.height)
    guard let context = CGContext(
        data: nil,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue
    ) else {
        throw NSError(domain: "CropPhotos", code: 3, userInfo: [NSLocalizedDescriptionKey: "Cannot create resize context"])
    }

    context.interpolationQuality = .high
    context.draw(image, in: CGRect(origin: .zero, size: size))
    guard let resized = context.makeImage() else {
        throw NSError(domain: "CropPhotos", code: 4, userInfo: [NSLocalizedDescriptionKey: "Cannot resize image"])
    }
    return resized
}

try FileManager.default.createDirectory(atPath: "public/couple", withIntermediateDirectories: true)

for job in jobs {
    let inputURL = URL(fileURLWithPath: job.input)
    guard let source = CGImageSourceCreateWithURL(inputURL as CFURL, nil),
          let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
        throw NSError(domain: "CropPhotos", code: 5, userInfo: [NSLocalizedDescriptionKey: "Cannot open \(job.input)"])
    }

    guard let cropped = image.cropping(to: job.crop) else {
        throw NSError(domain: "CropPhotos", code: 6, userInfo: [NSLocalizedDescriptionKey: "Cannot crop \(job.input)"])
    }

    let resized = try resize(cropped, to: job.size)
    try writeJPEG(resized, to: job.output)
    print("\(job.output): \(Int(job.size.width))x\(Int(job.size.height))")
}
