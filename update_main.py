import re

with open('public/js/main.js', 'r') as f:
    content = f.read()

# Replace the environment setup code with a call to setupSceneEnvironment
start_marker = "// 2. Environment (Table & Room)"
end_marker = "// 9. Interaction & Animation Logic"

setup_call = """
    // 2. Environment (Table & Room) setup extracted to sceneSetup.js
    const env = setupSceneEnvironment(scene, camera, pulleyNode);

    const paper = env.paper;
    const drawFrame = env.drawFrame;
    const thread = env.thread;
    const stylusGroup = env.stylusGroup;

    // We only need to redefine updateThread since it uses local variables
    const updateThread = (targetPoint) => {
        const positions = [
            pulleyNode.x, pulleyNode.y, pulleyNode.z,
            targetPoint.x, targetPoint.y, targetPoint.z
        ];
        thread.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
    };

"""

# Use regex to replace everything between the markers
pattern = re.compile(re.escape(start_marker) + r".*?" + re.escape(end_marker), re.DOTALL)
new_content = pattern.sub(setup_call + end_marker, content)

with open('public/js/main.js', 'w') as f:
    f.write(new_content)
