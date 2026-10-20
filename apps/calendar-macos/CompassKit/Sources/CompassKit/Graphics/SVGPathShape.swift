import CoreGraphics
import SwiftUI

/// Renders a Phosphor `regular` SVG path in a 256×256 view box.
public struct SVGPathShape: Shape {
    public let pathData: String

    public init(pathData: String) {
        self.pathData = pathData
    }

    public func path(in rect: CGRect) -> Path {
        let scaleX = rect.width / 256
        let scaleY = rect.height / 256
        let cgPath = SVGPathParser.makePath(d: pathData) { point in
            CGPoint(x: point.x * scaleX + rect.minX, y: point.y * scaleY + rect.minY)
        }
        return Path(cgPath)
    }
}

enum SVGPathParser {
    private struct Point {
        var x: Double
        var y: Double
    }

    static func makePath(
        d: String,
        transform: (Point) -> CGPoint
    ) -> CGPath {
        let tokens = tokenize(d)
        var index = 0
        var current = Point(x: 0, y: 0)
        var start = Point(x: 0, y: 0)
        var lastControl = Point(x: 0, y: 0)
        let path = CGMutablePath()

        func readDouble() -> Double {
            let token = tokens[index]
            index += 1
            return Double(token) ?? 0
        }

        func move(to point: Point) {
            current = point
            start = point
            path.move(to: transform(point))
        }

        func line(to point: Point) {
            current = point
            path.addLine(to: transform(point))
        }

        while index < tokens.count {
            let command = tokens[index]
            index += 1
            switch command {
            case "M":
                let x = readDouble()
                let y = readDouble()
                move(to: Point(x: x, y: y))
                while index < tokens.count, Double(tokens[index]) != nil {
                    let lx = readDouble()
                    let ly = readDouble()
                    line(to: Point(x: lx, y: ly))
                }
            case "m":
                let dx = readDouble()
                let dy = readDouble()
                move(to: Point(x: current.x + dx, y: current.y + dy))
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx = readDouble()
                    let dy = readDouble()
                    line(to: Point(x: current.x + dx, y: current.y + dy))
                }
            case "L":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let x = readDouble()
                    let y = readDouble()
                    line(to: Point(x: x, y: y))
                }
            case "l":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx = readDouble()
                    let dy = readDouble()
                    line(to: Point(x: current.x + dx, y: current.y + dy))
                }
            case "H":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let x = readDouble()
                    line(to: Point(x: x, y: current.y))
                }
            case "h":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx = readDouble()
                    line(to: Point(x: current.x + dx, y: current.y))
                }
            case "V":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let y = readDouble()
                    line(to: Point(x: current.x, y: y))
                }
            case "v":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dy = readDouble()
                    line(to: Point(x: current.x, y: current.y + dy))
                }
            case "C":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let x1 = readDouble()
                    let y1 = readDouble()
                    let x2 = readDouble()
                    let y2 = readDouble()
                    let x = readDouble()
                    let y = readDouble()
                    lastControl = Point(x: x2, y: y2)
                    path.addCurve(
                        to: transform(Point(x: x, y: y)),
                        control1: transform(Point(x: x1, y: y1)),
                        control2: transform(Point(x: x2, y: y2)))
                    current = Point(x: x, y: y)
                }
            case "c":
                while index < tokens.count, Double(tokens[index]) != nil {
                    let dx1 = readDouble()
                    let dy1 = readDouble()
                    let dx2 = readDouble()
                    let dy2 = readDouble()
                    let dx = readDouble()
                    let dy = readDouble()
                    let c1 = Point(x: current.x + dx1, y: current.y + dy1)
                    let c2 = Point(x: current.x + dx2, y: current.y + dy2)
                    let end = Point(x: current.x + dx, y: current.y + dy)
                    lastControl = c2
                    path.addCurve(
                        to: transform(end),
                        control1: transform(c1),
                        control2: transform(c2))
                    current = end
                }
            case "A", "a":
                while index < tokens.count, Double(tokens[index]) != nil {
                    _ = readDouble()
                    _ = readDouble()
                    _ = readDouble()
                    _ = readDouble()
                    _ = readDouble()
                    let x = readDouble()
                    let y = readDouble()
                    if command == "a" {
                        line(to: Point(x: current.x + x, y: current.y + y))
                    } else {
                        line(to: Point(x: x, y: y))
                    }
                }
            case "Z", "z":
                path.closeSubpath()
                current = start
            default:
                break
            }
        }

        return path
    }

    private static func tokenize(_ d: String) -> [String] {
        var tokens: [String] = []
        var current = ""
        for character in d {
            if character.isLetter {
                if !current.isEmpty {
                    tokens.append(current)
                    current = ""
                }
                tokens.append(String(character))
            } else if character == "," || character == " " || character == "\n" || character == "\t" {
                if !current.isEmpty {
                    tokens.append(current)
                    current = ""
                }
            } else if character == "-" && !current.isEmpty {
                tokens.append(current)
                current = String(character)
            } else {
                current.append(character)
            }
        }
        if !current.isEmpty { tokens.append(current) }
        return tokens
    }
}
