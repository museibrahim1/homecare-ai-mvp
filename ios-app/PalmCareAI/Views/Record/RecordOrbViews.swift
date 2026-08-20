import SwiftUI

// MARK: - Animated Voice Orb

struct VoiceOrb: View {
    let isActive: Bool
    let audioLevel: Float
    /// Outer box the orb must stay inside. Rings used to draw at 230pt while
    /// the parent frame was 160pt, which overflowed into the labels below.
    var size: CGFloat = 240

    @State private var rotation: Double = 0
    @State private var morphPhase: CGFloat = 0

    private var normalizedLevel: CGFloat {
        CGFloat(max(0, min(1, audioLevel)))
    }

    private var coreSize: CGFloat { size * 0.58 }
    private var scale: CGFloat { size / 240 }

    var body: some View {
        ZStack {
            ForEach(0..<3, id: \.self) { ring in
                OrbRing(
                    phase: morphPhase + CGFloat(ring) * 0.7,
                    audioLevel: normalizedLevel,
                    ringIndex: ring
                )
                .frame(width: orbSize(for: ring), height: orbSize(for: ring))
                .rotationEffect(.degrees(rotation + Double(ring) * 40))
            }

            OrbShape(phase: morphPhase, audioLevel: normalizedLevel)
                .fill(PalmBrandOrb.fill)
                .frame(width: coreSize, height: coreSize)
                .shadow(color: Color.palmPrimary.opacity(isActive ? 0.55 : 0.28), radius: isActive ? 18 * scale : 10 * scale, y: 0)
                .overlay(
                    OrbShape(phase: morphPhase, audioLevel: normalizedLevel)
                        .fill(
                            RadialGradient(
                                colors: [.white.opacity(0.28), .clear],
                                center: UnitPoint(x: 0.3, y: 0.25),
                                startRadius: 0,
                                endRadius: coreSize * 0.55
                            )
                        )
                        .frame(width: coreSize, height: coreSize)
                )

            if isActive {
                HStack(spacing: 3 * scale) {
                    ForEach(0..<5, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.white)
                            .frame(width: max(2, 3 * scale), height: barHeight(for: i))
                    }
                }
            } else {
                Image(systemName: "mic")
                    .font(.system(size: 40 * scale, weight: .medium))
                    .foregroundColor(.white)
            }
        }
        .frame(width: size, height: size)
        .clipped()
        .onAppear {
            withAnimation(.linear(duration: 12).repeatForever(autoreverses: false)) { rotation = 360 }
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) { morphPhase = 1 }
        }
    }

    private func orbSize(for ring: Int) -> CGFloat {
        let base = size * (0.72 + CGFloat(ring) * 0.11)
        return min(size, base + (isActive ? normalizedLevel * 8 * scale : 0))
    }

    private func barHeight(for index: Int) -> CGFloat {
        max(6 * scale, (12 + normalizedLevel * 24 + sin(morphPhase * .pi * 2 + CGFloat(index) * 1.2) * 8) * scale)
    }
}

struct OrbShape: Shape {
    var phase: CGFloat
    var audioLevel: CGFloat

    var animatableData: AnimatablePair<CGFloat, CGFloat> {
        get { AnimatablePair(phase, audioLevel) }
        set { phase = newValue.first; audioLevel = newValue.second }
    }

    func path(in rect: CGRect) -> Path {
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2
        let points = 120
        var path = Path()
        for i in 0...points {
            let angle = CGFloat(i) / CGFloat(points) * .pi * 2
            let r = radius
                + sin(angle * 3 + phase * .pi * 2) * (4 + audioLevel * 8)
                + cos(angle * 2 - phase * .pi * 1.5) * (3 + audioLevel * 6)
                + sin(angle * 5 + phase * .pi * 3) * (2 + audioLevel * 4)
            let point = CGPoint(x: center.x + r * cos(angle), y: center.y + r * sin(angle))
            if i == 0 { path.move(to: point) } else { path.addLine(to: point) }
        }
        path.closeSubpath()
        return path
    }
}

struct OrbRing: View {
    let phase: CGFloat
    let audioLevel: CGFloat
    let ringIndex: Int

    var body: some View {
        OrbShape(phase: phase, audioLevel: audioLevel * 0.5)
            .stroke(AngularGradient(colors: ringColors, center: .center), lineWidth: ringIndex == 0 ? 2 : 1.5)
            .opacity(0.3 - Double(ringIndex) * 0.08)
    }

    private var ringColors: [Color] {
        switch ringIndex {
        case 0:
            return [
                Color(red: 139 / 255, green: 92 / 255, blue: 246 / 255).opacity(0.22),
                Color(red: 139 / 255, green: 92 / 255, blue: 246 / 255).opacity(0.08),
            ]
        case 1:
            return [Color.palmPrimaryLight.opacity(0.45), Color.palmPrimaryLight.opacity(0.15)]
        default:
            return [Color.palmPrimary.opacity(0.55), Color.palmPrimary.opacity(0.2)]
        }
    }
}

// MARK: - Highlighted Text

struct WrappingHStack: View {
    let words: [String]

    var body: some View {
        var text = Text("")
        for (i, word) in words.enumerated() {
            let sep = i > 0 ? Text(" ") : Text("")
            if LiveTranscriptionService.isMedicalKeyword(word) {
                text = text + sep + Text(word)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.palmPrimary)
            } else {
                text = text + sep + Text(word)
                    .font(.system(size: 17))
                    .foregroundColor(.palmText)
            }
        }
        return text
            .lineSpacing(6)
            .multilineTextAlignment(.leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .fixedSize(horizontal: false, vertical: true)
    }
}

// MARK: - Speaker Colors

let speakerColors: [Color] = [
    Color.palmPrimary,
    Color.palmBlue,
    Color.palmPurple,
    Color.palmOrange,
]

func speakerColor(for speaker: Int) -> Color {
    speakerColors[speaker % speakerColors.count]
}

// MARK: - Main Record View

